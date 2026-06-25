# Segurança por Certificados (PKI / Autoridade Certificadora)

> Requisito de segurança do projeto. Implementa autenticação de **dispositivos por
> certificado**, **não-repúdio** de conteúdo e **separação de papéis**. Este documento
> explica o **porquê**, o **como** e tem o **guião de demonstração** para a defesa.

---

## 1. O problema (e porque é que uma password não chega)

Com login por email/password, qualquer máquina na rede pode tentar entrar. Isso abre porta a:

- **Pirataria** — dispositivos não autorizados a usar a plataforma.
- **Man-in-the-middle (MITM)** — alguém pelo meio a tentar obter uma sessão.
- **Repúdio** — um utilizador negar que foi ele a publicar um conteúdo ("não fui eu").

A solução pedida usa **criptografia de chave pública** e uma **Autoridade Certificadora (CA)**.

---

## 2. Conceitos

- **Par de chaves** (privada + pública). O que uma assina, a outra verifica. A **privada
  nunca é partilhada**.
- **Certificado** — documento que diz "*esta chave pública pertence a este dispositivo/utilizador*",
  **assinado pela CA**. É como um bilhete de identidade digital.
- **Autoridade Certificadora (CA)** — a **entidade que emite** os certificados. A sua **chave
  privada** é o segredo máximo. O **servidor da aplicação só tem a chave pública da CA** e
  **apenas verifica** — não emite. *Quem emite ≠ quem serve* → maior segurança (é exatamente
  o ponto que o professor sublinhou: "quem gere os certificados não é o servidor").
- **Não-repúdio** — como só o dono da chave privada consegue produzir uma assinatura válida,
  uma assinatura prova **inegavelmente** a autoria. O autor não pode depois negar.

---

## 3. Como funciona aqui

> Implementação **ao nível da aplicação** (e não TLS de transporte) para funcionar igual em
> Web, Desktop e Mobile. Algoritmo: **ECDSA P-256 + SHA-256** — nativo no Node (`crypto`) e no
> browser (Web Crypto), sem bibliotecas. Assinaturas no formato cru **IEEE-P1363** (compatível
> entre os dois lados). Um certificado é um **documento JSON assinado pela CA**.

### 3.1 Emissão (a CA dá um certificado a um dispositivo)

```
CLI no servidor (pnpm cert:issue)
  1. gera par de chaves DO DISPOSITIVO (privada + pública)
  2. monta o certificado: { deviceId, userId, role, chave pública, validade }
  3. a CA ASSINA o certificado com a sua CHAVE PRIVADA
  4. regista o dispositivo (estado ACTIVE) na base de dados
  5. escreve um "pacote de inscrição" (.enrollment.json) com a chave PRIVADA do dispositivo
     → este ficheiro é importado no cliente
```

### 3.2 Handshake (o dispositivo prova quem é, ao ligar-se)

```
Cliente                                   Servidor
  │   POST /devices/challenge  ───────────▶  gera um NONCE aleatório (uso único)
  │   ◀───────────────────────────────────  { nonce }
  │
  │   assina o nonce com a sua CHAVE PRIVADA
  │   POST /devices/handshake { cert, nonce, assinatura } ─────▶
  │                                          (a) certificado foi assinado pela CA?  (chave pública da CA)
  │                                          (b) está dentro da validade?
  │                                          (c) dispositivo não está revogado?
  │                                          (d) PROVA DE POSSE: a assinatura do nonce
  │                                              bate com a chave pública do certificado?
  │   ◀────── { deviceToken } ──────────────  se tudo OK → emite token de sessão de dispositivo
```

A partir daí, cada pedido leva o cabeçalho `X-Device-Token`. Sem um certificado válido (ou
um *bypass* autorizado), o servidor responde **403 "Dispositivo não certificado"** — a máquina
**não conecta**. É controlado pela variável `PKI_ENFORCE` no servidor.

**Porque resolve MITM:** apresentar o certificado **não chega** — é preciso **assinar o nonce**
com a chave privada, que nunca circula. Quem estiver pelo meio não a tem, logo **não obtém sessão**.

**Porque resolve pirataria:** só máquinas com certificado emitido pela CA (ou explicitamente
autorizadas) entram.

### 3.3 Não-repúdio (provar quem publicou um conteúdo)

Ao publicar, o cliente **assina** a mensagem canónica da notícia (`título + corpo + autor`) com
a sua chave privada e envia para `POST /news/:id/sign`. O servidor **verifica** contra a chave
pública certificada e guarda a assinatura.

Qualquer pessoa pode depois pedir `GET /news/:id/signature`: o servidor **recalcula o hash do
conteúdo atual** e revalida a assinatura. Resultado:

- ✔ **Autêntica** — só a chave privada daquele dispositivo certificado a poderia ter produzido.
- ✘ **Inválida** — o conteúdo foi alterado depois de assinado, ou a assinatura não corresponde.

> **Pergunta de exame — "Como validam que este utilizador colocou este conteúdo na plataforma?"**
> Resposta: o conteúdo está **assinado** pela chave privada do dispositivo do autor, cujo
> certificado foi emitido pela CA a esse utilizador. A assinatura é **verificável por terceiros**
> e **inalterável** — é o não-repúdio. Botão "🔏 Verificar autenticidade" na página da notícia.

---

## 4. Adicionar uma máquina SEM certificado (bypass) — cenário do exame

O professor referiu que há "*um código no servidor que adiciona máquinas sem certificado*". É o
comando **`cert:bypass`**: regista um dispositivo com estado `BYPASS` (lista de exceção). Essa
máquina liga-se apresentando apenas o `deviceId`, sem certificado.

```bash
pnpm cert:bypass --label "Máquina do júri"
# imprime um deviceId (ex.: dev_AbC123...)
```

No cliente, abrir **"Dispositivo & Certificado" → "Ligar sem certificado"** e colar o `deviceId`.
(Também há o botão equivalente na página de Administração → Dispositivos.)

> Isto demonstra que o controlo é **do servidor**: por omissão ninguém entra sem certificado,
> mas o administrador pode abrir exceções explícitas e auditáveis.

---

## 5. Separação de papéis (RBAC)

> "*O administrador não pode fazer tudo que um usuário normal faz; deve simplesmente fazer a
> gestão das contas.*"

| Papel | Pode | Não pode |
|---|---|---|
| **ADMIN** | gerir **contas** (papéis), **dispositivos/certificados** (revogar, bypass), ver **logs** | criar/editar/publicar notícias, media ou transmissões |
| **EDITOR** | criar/editar/publicar **conteúdo** (notícias, media, streaming) e **assiná-lo** | gerir contas ou certificados |
| **READER** | ler, comentar, guardar | qualquer gestão |

A separação é imposta nas rotas (`requireRole('EDITOR')` no conteúdo; `requireRole('ADMIN')` na
gestão) e refletida na UI (o menu do ADMIN não mostra ações de conteúdo).

---

## 6. Comandos (a "consola da CA" no servidor)

```bash
pnpm ca:init                                   # inicializa a CA (gera as chaves) — uma vez
pnpm cert:issue --user editor@isptec.local --label "PC do Editor"
pnpm cert:list                                 # lista dispositivos/certificados
pnpm cert:revoke --serial <serial>             # revoga (deixa de conectar)
pnpm cert:bypass --label "Máquina sem certificado"   # autoriza máquina SEM certificado
```

Ativar a exigência de certificado no servidor: `PKI_ENFORCE=true` em `apps/api/.env`
(por omissão `false` em desenvolvimento, para não atrapalhar o dia-a-dia).

---

## 7. Onde está no código

| Camada | Ficheiros |
|---|---|
| **CA / cripto** | `apps/api/src/security/pki/{keys,cert,ca,nonceStore}.ts` |
| **Chaves da CA** | `apps/api/.pki/ca.private.pem` (secreta, gitignored) · `ca.public.pem` |
| **Handshake / gestão** | `apps/api/src/routes/devices.ts` |
| **Porta de dispositivo** | `apps/api/src/middleware/deviceCert.ts` (`deviceGate`) + `PKI_ENFORCE` |
| **Token de sessão** | `apps/api/src/lib/jwt.ts` (`signDeviceToken`) |
| **Não-repúdio** | `apps/api/src/routes/news.ts` (`POST /:id/sign`, `GET /:id/signature`) |
| **CLI** | `apps/api/scripts/pki.ts` (+ scripts em `package.json`) |
| **Modelo de dados** | `prisma/schema.prisma` (`Device`, `ContentSignature`, `DeviceStatus`) |
| **Cliente (cripto)** | `apps/web/src/lib/device.ts` (Web Crypto, handshake, assinatura) |
| **Cliente (UI)** | `pages/Device.tsx`, `components/Authenticity.tsx`, painel em `pages/Admin.tsx` |
| **Tipos partilhados** | `packages/shared/src/index.ts` (secção PKI) |

---

## 8. Demonstração passo-a-passo (defesa)

```bash
# 0) BD a correr + migração aplicada
pnpm db:up && pnpm db:migrate

# 1) Inicializar a Autoridade Certificadora
pnpm ca:init

# 2) Emitir um certificado para o editor
pnpm cert:issue --user editor@isptec.local --label "PC do Editor"
#    → gera dev_xxx.enrollment.json

# 3) Ligar a exigência de certificado e arrancar
#    (apps/api/.env)  PKI_ENFORCE=true
pnpm dev
```

1. **Sem certificado não entra:** abrir a Web → as chamadas dão *Dispositivo não certificado*.
2. **Importar o certificado:** menu → "Dispositivo & Certificado" → importar o `.enrollment.json`
   → "sessão de dispositivo ativa" → a plataforma passa a funcionar.
3. **Não-repúdio:** entrar como editor, publicar uma notícia, abri-la e clicar
   **"🔏 Verificar autenticidade"** → ✔ assinada por <editor>, certificado <série>, emitido por ISPTEC-CA.
4. **Adulteração:** alterar o corpo da notícia diretamente na BD e verificar de novo → ✘ inválida.
5. **Máquina sem certificado (exame):** `pnpm cert:bypass --label "Júri"` → colar o `deviceId`
   em "Ligar sem certificado" → conecta na mesma.
6. **Revogação / pirataria:** `pnpm cert:revoke --serial <série>` → a máquina deixa de conectar.
7. **Papéis:** entrar como **admin** → o menu não tem "Adicionar notícia"; tentar `POST /news` dá 403.
   Como **editor**, funciona.

---

## 9. Perguntas prováveis (e respostas curtas)

- **Quem emite os certificados?** A CA, não o servidor. O servidor só tem a chave **pública** da
  CA e **verifica**. A chave privada da CA está isolada (`ca.private.pem`, fora do versionamento).
- **Como impede MITM?** O cliente tem de **assinar um desafio (nonce)** com a chave privada —
  apresentar o certificado não basta. Sem a privada, ninguém pelo meio obtém sessão.
- **Como garante o não-repúdio?** O conteúdo é assinado pela chave privada do dispositivo do
  autor; a assinatura é verificável por todos e quebra se o conteúdo mudar.
- **E uma máquina sem certificado?** Só entra se o **administrador a autorizar** explicitamente
  com `cert:bypass` (exceção registada e auditável).
- **Porquê ao nível da aplicação e não mTLS?** Para funcionar igual nos três clientes
  (browser/desktop/mobile) sem instalar certificados no SO; os conceitos (CA, certificado,
  prova de posse, não-repúdio) são exatamente os mesmos.
