// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const {contextBridge, ipcRenderer} = require("electron");

// eslint-disable-next-line no-undef
contextBridge.exposeInMainWorld("electron", {
    ipcSend(...args) {
        return ipcRenderer.send(...args);
    },
    ipcSendSync(...args) {
        return ipcRenderer.sendSync(...args);
    },
    ipcOn(...args) {
        ipcRenderer.on(...args);
    },
    ipcOff(...args) {
        ipcRenderer.off(...args);
    }
});
