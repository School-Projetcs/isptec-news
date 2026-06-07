// Cliente Desktop (Electron) do ISPTEC News.
//
// Dois modos:
//   • DEV  — `pnpm --filter @isptec/desktop dev` arranca o Electron a carregar o
//            servidor Vite da Web (http://localhost:5173). Usa o proxy /api do Vite,
//            por isso fala com a API tal como o browser. (Requer `pnpm dev` a correr.)
//   • PROD — `pnpm --filter @isptec/desktop start` carrega o build estático de
//            apps/web/dist através de um protocolo próprio `app://` (com fallback SPA),
//            para que React Router e os assets funcionem sem servidor de ficheiros.
//
// O cliente multiplataforma (Windows/Linux/macOS) é satisfeito por aqui.

const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Localização do build da Web: empacotado (electron-builder copia para
// resources/web via extraResources) ou, em dev/prod-local, apps/web/dist.
const DIST = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, '..', 'web', 'dist');

// URL de desenvolvimento: passado como argumento (`electron . http://...`) ou via env.
const DEV_URL =
  process.env.ELECTRON_START_URL ||
  process.argv.find((a) => /^https?:\/\//.test(a)) ||
  null;

// O esquema `app://` tem de ser declarado privilegiado ANTES de o app ficar pronto.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

/** Serve apps/web/dist via app://, com fallback para index.html (Single Page App). */
function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    let filePath = path.join(DIST, decodeURIComponent(pathname));

    // Caminho inexistente ou diretório → devolve index.html (rotas do React Router).
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ISPTEC News',
    backgroundColor: '#0f1320',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Abrir links externos (target=_blank) no browser do sistema, não numa janela Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (DEV_URL) {
    void win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else if (fs.existsSync(path.join(DIST, 'index.html'))) {
    void win.loadURL('app://bundle/index.html');
  } else {
    // Sem build e sem URL de dev: mostra instruções em vez de uma janela em branco.
    const msg =
      'Build da Web não encontrado.\\n\\n' +
      'Dev:  pnpm dev  (noutro terminal)  +  pnpm --filter @isptec/desktop dev\\n' +
      'Prod: pnpm --filter @isptec/web build  +  pnpm --filter @isptec/desktop start';
    void win.loadURL('data:text/plain;charset=utf-8,' + encodeURIComponent(msg));
  }

  return win;
}

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
