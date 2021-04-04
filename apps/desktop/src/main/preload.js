// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const {contextBridge, ipcRenderer} = require("electron");

// eslint-disable-next-line no-undef
contextBridge.exposeInMainWorld("electron", {
    ipc: ipcRenderer
});
