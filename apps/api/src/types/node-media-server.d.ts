// node-media-server v4 não traz tipos. Declaração mínima do que usamos.
declare module 'node-media-server' {
  interface NmsSession {
    streamPath?: string;
    id?: string;
    [key: string]: unknown;
  }
  class NodeMediaServer {
    constructor(config: Record<string, unknown>);
    on(event: string, listener: (session: NmsSession) => void): void;
    run(): void;
  }
  export default NodeMediaServer;
}
