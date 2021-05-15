import listen, {HandleHandler, InvokeHandler, ListenResult} from "./impl";
import {ipcMain, WebContents} from "electron";
import AbortController from "node-abort-controller";

const ipcObjects = new Map<string, ListenResult>();
const handleAdders = new Set<(res: ListenResult) => void>();

export function registerWC(id: string, wc: WebContents): void {
    if (ipcObjects.has(id))
        throw new Error(`A target is already registered with ID '${id}'`);

    const obj = listen(
        () => new AbortController(),
        wc.send.bind(wc),
        ipcMain.on.bind(ipcMain),
        ipcMain.off.bind(ipcMain)
    );

    // add obj to list of existing
    ipcObjects.set(id, obj);

    // call any handlers that have already been set
    for (const add of handleAdders) {
        add(obj);
    }
}

export const handle: HandleHandler = (ev, respond) => {
    // add handlers to ipc objects that don't exist yet
    handleAdders.add(({handle}) => {
        handle(ev, respond);
    });

    // add handlers to existing ipc objects
    for (const [, {handle}] of ipcObjects.entries()) {
        handle(ev, respond);
    }
};

type InvokeHandlerFactory = (id: string) => InvokeHandler;
export const invoke: InvokeHandlerFactory = id => {
    if (!ipcObjects.has(id))
        throw new Error(`No target found with name '${id}'`);
    return ipcObjects.get(id).invoke;
};
