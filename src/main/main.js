const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, nativeTheme, dialog } = require('electron');
const { Store } = require('./store');

const isDev = process.env.NODE_ENV !== 'production';

let loadingWindow;
let loginWindow;
let mainWindow;
let stockDetailWindow;
let referenceModal;
const store = new Store();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f2933' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.maximize(); // Abrir la ventana maximizada

  if (isDev) {
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 500,
    resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  loginWindow.loadFile(path.join(__dirname, './login.html'));
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 300,
    height: 400,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  loadingWindow.loadFile(path.join(__dirname, './loading.html'));
}

function createStockDetailWindow(products) {
  stockDetailWindow = new BrowserWindow({
    width: 600,
    height: 700,
    parent: mainWindow,
    modal: true,
    title: 'Detalle de Stock',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  stockDetailWindow.loadFile(path.join(__dirname, '../renderer/stock-detail.html'));
  stockDetailWindow.setMenu(null);

  // Enviamos los datos de productos a la nueva ventana una vez que esté lista
  stockDetailWindow.webContents.on('did-finish-load', () => {
    stockDetailWindow.webContents.send('stock:data', products);
  });

  // Limpiar la referencia cuando la ventana se cierre
  stockDetailWindow.on('closed', () => {
    stockDetailWindow = null;
  });
}

function createReferenceModal() {
  return new Promise((resolve) => {
    referenceModal = new BrowserWindow({
      width: 400,
      height: 220,
      parent: mainWindow,
      modal: true,
      resizable: false,
      title: 'Referencia de Pago',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    referenceModal.loadFile(path.join(__dirname, '../renderer/reference-modal.html'));
    referenceModal.setMenu(null);

    ipcMain.once('reference:submit', (_, reference) => {
      resolve(reference);
      if (referenceModal) referenceModal.close();
    });
    referenceModal.on('closed', () => resolve(null)); // Resuelve null si se cierra la ventana
  });
}

app.whenReady().then(() => {
  createLoadingWindow();

  setTimeout(() => {
    loadingWindow.close();
    createLoginWindow();
  }, 3000); // Simula un tiempo de carga de 3 segundos

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !loginWindow && !mainWindow) {
      createLoadingWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function wrapHandler(fn) {
  return async (_, payload) => {
    try {
      const result = await fn(payload);
      return { success: true, data: result };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message || 'Operación fallida' };
    }
  };
}

// Handler para el intento de login
ipcMain.handle('login:attempt', wrapHandler(async ({ username, password }) => {
  // --- Lógica de validación ---
  // Por ahora, usaremos credenciales fijas. En un futuro, esto podría
  // consultar una base de datos o un servicio.
  if (username === 'admin' && password === '1234') {
    loginWindow.close();
    createMainWindow();
    return { success: true };
  }
  throw new Error('Credenciales incorrectas');
}));

// Handler para cerrar la aplicación desde la ventana de login
ipcMain.on('login:quit', () => app.quit());

// Handler para abrir la ventana de detalle de stock
ipcMain.on('stock:open-window', (event, products) => {
  if (stockDetailWindow) {
    stockDetailWindow.focus();
    return;
  }
  createStockDetailWindow(products);
});

// Handler para obtener la referencia de pago
ipcMain.handle('sale:get-reference', async () => {
  return await createReferenceModal();
});

ipcMain.handle('data:load', wrapHandler(async () => store.getData()));
ipcMain.handle('product:upsert', wrapHandler((payload) => store.upsertProduct(payload)));
ipcMain.handle('product:delete', wrapHandler(({ id }) => store.deleteProduct(id)));
ipcMain.handle('customer:upsert', wrapHandler((payload) => store.upsertCustomer(payload)));
ipcMain.handle('customer:delete', wrapHandler(({ id }) => store.deleteCustomer(id)));
ipcMain.handle('sale:record', wrapHandler((payload) => store.recordSale(payload)));

// Handlers para Backup, Import y Reset
ipcMain.handle('data:reset', wrapHandler(async () => {
  return store.resetData();
}));

ipcMain.handle('data:backup', wrapHandler(async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar respaldo de datos',
    defaultPath: `backup-ventas-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (canceled || !filePath) {
    return { success: true, data: 'Backup cancelado por el usuario.' };
  }

  const dataToBackup = JSON.stringify(store.getData(), null, 2);
  fs.writeFileSync(filePath, dataToBackup, 'utf-8');

  return { success: true, data: { path: filePath } };
}));

ipcMain.handle('data:import', wrapHandler(async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar respaldo de datos',
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: true, data: 'Importación cancelada por el usuario.' };
  }

  const filePath = filePaths[0];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const dataToImport = JSON.parse(fileContent);

  store.importData(dataToImport);

  return { success: true, data: { path: filePath } };
}));
