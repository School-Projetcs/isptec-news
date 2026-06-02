/**
 * Codificação de Huffman implementada de raiz (sem bibliotecas).
 * Demonstra compressão SEM perdas (lossless) e a sua taxa de compressão.
 *
 * Formato do ficheiro .huff produzido:
 *   [4 bytes  : tamanho original (uint32 LE)]
 *   [256*4 b  : tabela de frequências (uint32 LE)]  -> permite reconstruir a árvore
 *   [N bytes  : fluxo de bits comprimido]
 */

type HuffNode = {
  freq: number;
  byte?: number;
  left?: HuffNode;
  right?: HuffNode;
};

export type HuffmanResult = {
  encoded: Buffer;
  originalSize: number;
  encodedSize: number;
  ratio: number;
};

function buildTree(freq: number[]): HuffNode | null {
  const nodes: HuffNode[] = [];
  for (let i = 0; i < 256; i++) if (freq[i] > 0) nodes.push({ freq: freq[i], byte: i });
  if (nodes.length === 0) return null;
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq); // estável -> determinístico entre encode/decode
    const left = nodes.shift() as HuffNode;
    const right = nodes.shift() as HuffNode;
    nodes.push({ freq: left.freq + right.freq, left, right });
  }
  return nodes[0] as HuffNode;
}

export function huffmanEncode(input: Buffer): HuffmanResult {
  const originalSize = input.length;
  if (originalSize === 0) {
    return { encoded: Buffer.alloc(0), originalSize: 0, encodedSize: 0, ratio: 1 };
  }

  // 1) frequências
  const freq = new Array<number>(256).fill(0);
  for (const b of input) freq[b]++;

  // 2) árvore + códigos
  const root = buildTree(freq) as HuffNode;
  const codes: string[] = new Array(256).fill('');
  const walk = (n: HuffNode, prefix: string) => {
    if (n.byte !== undefined) {
      codes[n.byte] = prefix || '0'; // caso de 1 só símbolo
      return;
    }
    if (n.left) walk(n.left, prefix + '0');
    if (n.right) walk(n.right, prefix + '1');
  };
  walk(root, '');

  // 3) empacotar bits
  let numBits = 0;
  for (const b of input) numBits += codes[b].length;
  const body = Buffer.alloc(Math.ceil(numBits / 8));
  let bitPos = 0;
  for (const b of input) {
    const code = codes[b];
    for (let k = 0; k < code.length; k++) {
      if (code[k] === '1') body[bitPos >> 3] |= 0x80 >> (bitPos & 7);
      bitPos++;
    }
  }

  // 4) cabeçalho
  const header = Buffer.alloc(4 + 256 * 4);
  header.writeUInt32LE(originalSize, 0);
  for (let i = 0; i < 256; i++) header.writeUInt32LE(freq[i], 4 + i * 4);

  const encoded = Buffer.concat([header, body]);
  return {
    encoded,
    originalSize,
    encodedSize: encoded.length,
    ratio: encoded.length > 0 ? originalSize / encoded.length : 1,
  };
}

export function huffmanDecode(encoded: Buffer): Buffer {
  if (encoded.length === 0) return Buffer.alloc(0);
  const originalSize = encoded.readUInt32LE(0);
  const freq = new Array<number>(256).fill(0);
  for (let i = 0; i < 256; i++) freq[i] = encoded.readUInt32LE(4 + i * 4);
  const body = encoded.subarray(4 + 256 * 4);

  const root = buildTree(freq) as HuffNode;
  const out = Buffer.alloc(originalSize);

  // caso de 1 só símbolo
  if (root.byte !== undefined) {
    out.fill(root.byte);
    return out;
  }

  let node = root;
  let outIdx = 0;
  let bitPos = 0;
  while (outIdx < originalSize) {
    const bit = (body[bitPos >> 3] >> (7 - (bitPos & 7))) & 1;
    bitPos++;
    node = (bit ? node.right : node.left) as HuffNode;
    if (node.byte !== undefined) {
      out[outIdx++] = node.byte;
      node = root;
    }
  }
  return out;
}
