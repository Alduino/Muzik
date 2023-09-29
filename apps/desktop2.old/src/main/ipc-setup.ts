import {BrowserWindow} from "electron";
import {createIPCHandler} from "electron-trpc/main";
import {appRouter} from "./router";

let ipcHandler: ReturnType<typeof createIPCHandler> | undefined;

export function attachWindow(window: BrowserWindow) {
    if (ipcHandler) {
        ipcHandler.attachWindow(window);
    } else {
        ipcHandler = createIPCHandler({
            router: appRouter,
            windows: [window]
        });
    }
}

export function detachWindow(window: BrowserWindow) {
    if (!ipcHandler) return;
    ipcHandler.detachWindow(window);
}
