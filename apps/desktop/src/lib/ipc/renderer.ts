import type {IpcRenderer} from "electron";
import {
    eventName,
    MESSAGE_EVENT,
    TYPE_ABORT,
    TYPE_COMPLETE,
    TYPE_ERROR,
    TYPE_PROGRESS
} from "./common";

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

function randomString(length: number) {
    const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
    const arr = Array.from(
        {length},
        () => characters[Math.floor(Math.random() * characters.length)]
    );
    return arr.join("");
}

const {ipcSend, ipcOn, ipcOff} = window.electron;

export async function invoke<TResponse, TRequest = never, TProgress = never>(
    name: string,
    arg?: TRequest,
    onProgress?: (progress: TProgress) => void,
    abort?: AbortSignal
): Promise<TResponse> {
    console.debug("Invoking", name);
    const id = `message_${name}.${randomString(16)}`;

    let triggerComplete: (v: TResponse) => void;
    let triggerError: (error: unknown) => void;

    function handleAbort() {
        ipcSend(eventName(id, TYPE_ABORT));
    }

    function handleProgress(_: unknown, arg: TProgress) {
        onProgress?.(arg);
    }

    function handleError(_: unknown, arg: unknown) {
        console.debug("Response: error:", arg);
        triggerError(arg);
    }

    function handleComplete(_: unknown, arg: TResponse) {
        console.debug("Response: complete:", arg);
        triggerComplete(arg);
    }

    const promise = new Promise<TResponse>((yay, nay) => {
        triggerComplete = yay;
        triggerError = nay;

        abort?.addEventListener("abort", handleAbort);

        ipcOn(eventName(id, TYPE_PROGRESS), handleProgress);
        ipcOn(eventName(id, TYPE_ERROR), handleError);
        ipcOn(eventName(id, TYPE_COMPLETE), handleComplete);
    });

    ipcSend(MESSAGE_EVENT, {
        name,
        id,
        data: arg
    });

    try {
        return await promise;
    } catch (err) {
        abort?.removeEventListener("abort", handleAbort);
        err.message = "Invoke error: " + err.message;
        throw err;
    } finally {
        ipcOff(eventName(id, TYPE_PROGRESS), handleProgress);
        ipcOff(eventName(id, TYPE_ERROR), handleError);
        ipcOff(eventName(id, TYPE_COMPLETE), handleComplete);
    }
}
