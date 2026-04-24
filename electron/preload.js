const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pocketLedger", {
  loadData: () => ipcRenderer.invoke("app:data:load"),
  saveData: (payload) => ipcRenderer.invoke("app:data:save", payload),
  getDataLocation: () => ipcRenderer.invoke("app:data:location"),
  exportJson: (payload) => ipcRenderer.invoke("app:data:export-json", payload),
  exportCsv: (payload) => ipcRenderer.invoke("app:data:export-csv", payload),
  importJson: () => ipcRenderer.invoke("app:data:import-json"),
  openDataDirectory: () => ipcRenderer.invoke("app:data:open-directory")
});
