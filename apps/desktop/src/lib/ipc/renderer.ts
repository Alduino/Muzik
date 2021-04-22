import type {IpcRenderer} from "electron";
import {
    eventName,
    IpcName,
    MESSAGE_EVENT,
    TYPE_ABORT,
    TYPE_COMPLETE,
    TYPE_ERROR,
    TYPE_PROGRESS
} from "./common";
import {Semaphore} from "async-mutex";

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

const cache = new Map<string, unknown>();

function getCacheKey(event: IpcName<unknown, unknown, unknown>, arg: unknown) {
    return JSON.stringify([event, arg]);
}

const semaphore = new Semaphore(5);

export async function invoke<TResponse, TRequest = never, TProgress = never>(
    event: IpcName<TResponse, TRequest, TProgress>,
    arg?: TRequest,
    onProgress?: (progress: TProgress) => void,
    abort?: AbortSignal
): Promise<TResponse> {
    return semaphore.runExclusive(async () => {
        const cacheKey = getCacheKey(event, arg);

        if (event.cache) {
            if (cache.has(cacheKey)) return cache.get(cacheKey) as TResponse;
        }

        const id = `message_${event.name}.${randomString(16)}`;

        let triggerComplete: (v: TResponse) => void;
        let triggerError: (error: unknown) => void;

        function handleAbort() {
            ipcSend(eventName(id, TYPE_ABORT));
        }

        function handleProgress(_: unknown, arg: TProgress) {
            onProgress?.(arg);
        }

        function handleError(_: unknown, arg: Error) {
            const errorWrapper = new Error();

            if (typeof arg === "string") errorWrapper.message = arg;
            else {
                errorWrapper.name = arg.name || "IpcError";
                errorWrapper.message = arg.message;
                errorWrapper.stack = arg.stack;
            }

            triggerError(errorWrapper);
        }

        function handleComplete(_: unknown, arg: TResponse) {
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
            name: event.name,
            id,
            data: arg
        });

        try {
            const result = await promise;
            if (event.cache) cache.set(cacheKey, result);
            return result;
        } catch (err) {
            abort?.removeEventListener("abort", handleAbort);
            err.message = "Invoke error: " + err.message;
            throw err;
        } finally {
            ipcOff(eventName(id, TYPE_PROGRESS), handleProgress);
            ipcOff(eventName(id, TYPE_ERROR), handleError);
            ipcOff(eventName(id, TYPE_COMPLETE), handleComplete);
        }
    });
}
