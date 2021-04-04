// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const {contextBridge, ipcRenderer} = require("electron");

// eslint-disable-next-line no-undef
contextBridge.exposeInMainWorld("electron", {
    ipcSend: ipcRenderer.send.bind(ipcRenderer),
    ipcSendSync: ipcRenderer.sendSync.bind(ipcRenderer),
    ipcOn: ipcRenderer.on.bind(ipcRenderer),
    ipcOff: ipcRenderer.off.bind(ipcRenderer)
});
