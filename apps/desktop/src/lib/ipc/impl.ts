import {
    EventMessage,
    eventName,
    IpcName,
    MESSAGE_EVENT,
    TYPE_ABORT,
    TYPE_COMPLETE,
    TYPE_ERROR,
    TYPE_PROGRESS
} from "./common";
import type {IpcMainEvent, IpcRendererEvent} from "electron";
import {log} from "../../node/logger";
import {Semaphore} from "async-mutex";

interface AbortSignal {
    readonly aborted: boolean;
    addEventListener(
        type: "abort",
        listener: (this: AbortSignal, event: Event) => void
    ): void;
    removeEventListener(
        type: "abort",
        listener: (this: AbortSignal, event: Event) => void
    ): void;
}

interface AbortController {
    signal: AbortSignal;
    abort(): void;
}

type IpcEvent = IpcMainEvent | IpcRendererEvent;

export type SendFunction = (channel: string, ...args: unknown[]) => void;

export type ListenFunction = (
    channel: string,
    listener: (event: IpcEvent, ...args: unknown[]) => void
) => void;

type HandlerFn = (event: IpcEvent, arg: EventMessage<unknown>) => Promise<void>;

type Responder<TRequest, TResponse, TProgress> = (
    arg: TRequest,
    progress: (v: TProgress) => void,
    abort: AbortSignal
) => Promise<TResponse> | TResponse;

function randomString(length: number) {
    const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
    const arr = Array.from(
        {length},
        () => characters[Math.floor(Math.random() * characters.length)]
    );
    return arr.join("");
}

function isMainEvent(ev: IpcEvent): ev is IpcMainEvent {
    if (!ev) return false;
    return typeof (ev as IpcMainEvent).reply === "function";
}

function reply<T>(ev: IpcEvent, sendFn: SendFunction, name: string, data: T) {
    if (isMainEvent(ev)) {
        // in main process - reply to whoever sent the event
        ev.reply(name, data);
    } else {
        // in renderer process - reply to main process
        sendFn(name, data);
    }
}

function getCacheKey(event: IpcName<never>, arg: unknown) {
    return JSON.stringify([event, arg]);
}

export type HandleHandler = <TResponse, TRequest = never, TProgress = never>(
    event: IpcName<TResponse, TRequest, TProgress>,
    respond: Responder<TRequest, TResponse, TProgress>
) => void;

export type InvokeHandler = <TResponse, TRequest = never, TProgress = never>(
    event: IpcName<TResponse, TRequest, TProgress>,
    arg?: TRequest,
    onProgress?: (progress: TProgress) => void,
    abort?: AbortSignal
) => Promise<TResponse>;

function listenImpl(
    abortControllerConstructor: () => AbortController,
    sendFn: SendFunction,
    listenFn: ListenFunction,
    unlistenFn: ListenFunction
): HandleHandler {
    const listeners = new Map<string, HandlerFn>();

    listenFn(MESSAGE_EVENT, (event, arg: EventMessage<unknown>) => {
        const {name, id} = arg;

        if (listeners.has(name)) {
            listeners.get(name)(event, arg);
        } else {
            log.warn("Received unknown event", name);
            reply(
                event,
                sendFn,
                eventName(id, TYPE_ERROR),
                new Error(`Invalid event, '${name}'`)
            );
        }
    });

    return function handle<TResponse, TRequest = never, TProgress = never>(
        event: IpcName<TResponse, TRequest, TProgress>,
        respond: Responder<TRequest, TResponse, TProgress>
    ): void {
        const {name} = event;

        if (listeners.has(name))
            throw new Error("More than one listener registered");

        listeners.set(name, async (event, arg: EventMessage<TRequest>) => {
            const {id: messageId} = arg;
            const abortController = abortControllerConstructor();

            function sendProgress(progress: TProgress) {
                reply(
                    event,
                    sendFn,
                    eventName(messageId, TYPE_PROGRESS),
                    progress
                );
            }

            function handleAbort() {
                abortController.abort();
            }

            listenFn(eventName(messageId, TYPE_ABORT), handleAbort);

            try {
                const result = await respond(
                    arg.data,
                    sendProgress,
                    abortController.signal
                );

                reply(
                    event,
                    sendFn,
                    eventName(messageId, TYPE_COMPLETE),
                    result
                );
            } catch (err) {
                reply(event, sendFn, eventName(messageId, TYPE_ERROR), {
                    message: err.message,
                    stack: err.stack
                });

                log.warn(err, "An error occurred in an invocation");
            }

            unlistenFn(eventName(messageId, TYPE_ABORT), handleAbort);
        });
    };
}

function sendImpl(
    sendFn: SendFunction,
    listenFn: ListenFunction,
    unlistenFn: ListenFunction
): InvokeHandler {
    const cache = new Map<string, unknown>();
    const semaphore = new Semaphore(15);

    return function invoke<TResponse, TRequest = never, TProgress = never>(
        name: IpcName<TResponse, TRequest, TProgress>,
        arg?: TRequest,
        onProgress?: (progress: TProgress) => void,
        abort?: AbortSignal
    ): Promise<TResponse> {
        return semaphore.runExclusive(async () => {
            const cacheKey = getCacheKey(name, arg);

            if (name.cache) {
                if (cache.has(cacheKey))
                    return cache.get(cacheKey) as TResponse;
            }

            const id = `message_${name.name}.${randomString(16)}`;

            let triggerComplete: (v: TResponse) => void;
            let triggerError: (error: Error) => void;

            function handleAbort(event: IpcEvent) {
                reply(event, sendFn, eventName(id, TYPE_ABORT), undefined);
            }

            function handleProgress(_: unknown, arg: TProgress) {
                onProgress?.(arg);
            }

            function handleError(_: unknown, arg: Error | string) {
                const errorWrapper = new Error();

                if (typeof arg === "string") {
                    errorWrapper.message = arg;
                } else {
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

                listenFn(eventName(id, TYPE_PROGRESS), handleProgress);
                listenFn(eventName(id, TYPE_ERROR), handleError);
                listenFn(eventName(id, TYPE_COMPLETE), handleComplete);
            });

            sendFn(MESSAGE_EVENT, {name: name.name, id, data: arg});

            try {
                const result = await promise;
                if (name.cache) cache.set(cacheKey, result);
                return result;
            } catch (err) {
                err.message = `Invoke error: ${err.message}`;
                throw err;
            } finally {
                abort?.removeEventListener("abort", handleAbort);
                unlistenFn(eventName(id, TYPE_PROGRESS), handleProgress);
                unlistenFn(eventName(id, TYPE_ERROR), handleError);
                unlistenFn(eventName(id, TYPE_COMPLETE), handleComplete);
            }
        });
    };
}

export interface ListenResult {
    handle: HandleHandler;
    invoke: InvokeHandler;
}

/**
 * Creates handler and invoker functions
 * @param abortControllerConstructor - Return an AbortController instance, used to create proxy AbortSignal in `handle`
 * @param sendFn - IPC `send` function
 * @param listenFn - IPC `on` function
 * @param unlistenFn - IPC `off` function
 */
export default function listen(
    abortControllerConstructor: () => AbortController,
    sendFn: SendFunction,
    listenFn: ListenFunction,
    unlistenFn: ListenFunction
): ListenResult {
    const handle = listenImpl(
        abortControllerConstructor,
        sendFn,
        listenFn,
        unlistenFn
    );
    const invoke = sendImpl(sendFn, listenFn, unlistenFn);

    return {
        handle,
        invoke
    };
}
