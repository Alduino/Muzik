import type {IpcRenderer} from "electron";
import listen from "./impl";

declare global {
    interface Window {
        electron: {
            ipcSend: IpcRenderer["send"];
            ipcSendSync: IpcRenderer["sendSync"];
            ipcOn: IpcRenderer["on"];
            ipcOff: IpcRenderer["off"];
        };
    }
}

export const {handle, invoke} = listen(
    () => new AbortController(),
    window.electron.ipcSend,
    window.electron.ipcOn,
    window.electron.ipcOff
);
