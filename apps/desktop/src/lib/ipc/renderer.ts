import type {IpcRenderer} from "electron";

import {
    EventMessage,
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
            ipc: IpcRenderer;
        };
    }
}

const {ipc} = window.electron;

export async function invoke<TResponse, TRequest = never, TProgress = never>(
    name: string,
    arg?: TRequest,
    onProgress?: (progress: TProgress) => void,
    abort?: AbortSignal
): Promise<TResponse> {
    console.debug("Invoking", name);
    const id: string = ipc.sendSync(MESSAGE_EVENT, {
        name,
        data: arg
    } as EventMessage<TRequest>);

    console.debug("Invoke ID:", id);

    let triggerComplete: (v: TResponse) => void;
    let triggerError: (error: unknown) => void;

    function handleAbort() {
        ipc.send(eventName(id, TYPE_ABORT));
    }

    function handleProgress(_: unknown, arg: TProgress) {
        onProgress?.(arg);
    }

    function handleError(_: unknown, arg: unknown) {
        triggerError(arg);
    }

    function handleComplete(_: unknown, arg: TResponse) {
        triggerComplete(arg);
    }

    try {
        return await new Promise<TResponse>((yay, nay) => {
            triggerComplete = yay;
            triggerError = nay;

            abort?.addEventListener("abort", handleAbort);

            ipc.on(eventName(id, TYPE_PROGRESS), handleProgress);
            ipc.on(eventName(id, TYPE_ERROR), handleError);
            ipc.on(eventName(id, TYPE_COMPLETE), handleComplete);
        });
    } catch (err) {
        abort?.removeEventListener("abort", handleAbort);
        ipc.off(eventName(id, TYPE_PROGRESS), handleProgress);
        ipc.off(eventName(id, TYPE_ERROR), handleError);
        ipc.off(eventName(id, TYPE_COMPLETE), handleComplete);
        throw err;
    }
}
