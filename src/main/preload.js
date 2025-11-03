const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload || {});
}

contextBridge.exposeInMainWorld('api', {
  login: (credentials) => invoke('login:attempt', credentials),
  quit: () => ipcRenderer.send('login:quit'),
  openStockWindow: (products) => ipcRenderer.send('stock:open-window', products),
  loadData: () => invoke('data:load'),
  saveProduct: (product) => invoke('product:upsert', product),
  deleteProduct: (id) => invoke('product:delete', { id }),
  saveCustomer: (customer) => invoke('customer:upsert', customer),
  deleteCustomer: (id) => invoke('customer:delete', { id }),
  recordSale: (sale) => invoke('sale:record', sale),
  getPaymentReference: () => ipcRenderer.invoke('sale:get-reference'),
  resetData: () => invoke('data:reset'),
  backupData: () => invoke('data:backup'),
  importData: () => invoke('data:import'),
  submitReference: (ref) => ipcRenderer.send('reference:submit', ref),
  on: (channel, listener) => {
    // Lista de canales válidos para recibir datos desde el proceso principal
    const validChannels = ['stock:data'];
    if (!validChannels.includes(channel)) return () => {};
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
