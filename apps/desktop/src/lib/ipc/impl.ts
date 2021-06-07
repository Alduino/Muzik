import {log} from "../../node/logger";
import {
    EventMessage,
    eventName,
    EventType,
    IpcName,
    MESSAGE_COMMUNICATION,
    MESSAGE_EVENT,
    TYPE_ABORT,
    TYPE_COMPLETE,
    TYPE_ERROR,
    TYPE_PROGRESS
} from "./common";
import type {IpcMainEvent, IpcRendererEvent} from "electron";

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

function communicate<T>(
    ev: IpcEvent,
    sendFn: SendFunction,
    type: EventType,
    id: string,
    data: T
) {
    reply(ev, sendFn, MESSAGE_COMMUNICATION, {name: type, id, data});
}

function getCacheKey(event: IpcName<never>, arg: unknown) {
    return JSON.stringify([event, arg]);
}

function listenToComms(listenFn: ListenFunction) {
    const eventHandlers: Record<
        EventType,
        Map<string, (arg: unknown) => void>
    > = {
        [TYPE_ERROR]: new Map(),
        [TYPE_PROGRESS]: new Map(),
        [TYPE_ABORT]: new Map(),
        [TYPE_COMPLETE]: new Map()
    };

    function handleEvent(
        event: IpcEvent,
        {name, id, data}: EventMessage<unknown>
    ) {
        const handler = eventHandlers[name as EventType].get(id);
        if (handler) handler(data);
    }

    listenFn(MESSAGE_COMMUNICATION, handleEvent);

    function listenTo<T>(
        type: EventType,
        id: string,
        handler: (arg: T) => void
    ) {
        eventHandlers[type].set(id, handler);
    }

    function stopListeningTo(type: EventType, id: string) {
        eventHandlers[type].delete(id);
    }

    return {listenTo, stopListeningTo};
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

    const {listenTo, stopListeningTo} = listenToComms(listenFn);

    listenFn(MESSAGE_EVENT, (event, arg: EventMessage<unknown>) => {
        const {name, id} = arg;

        if (listeners.has(name)) {
            listeners.get(name)(event, arg);
        } else {
            log.warn("Received unknown event", name);
            communicate(
                event,
                sendFn,
                TYPE_ERROR,
                id,
                new Error(`Invalid event, '${name}'`)
            );
        }
    });

    return function handle<TResponse, TRequest = never, TProgress = never>(
        event: IpcName<TResponse, TRequest, TProgress>,
        respond: Responder<TRequest, TResponse, TProgress>
    ): void {
        if (!event) throw new Error("IPC handler event is not defined");

        const {name} = event;

        if (listeners.has(name))
            throw new Error("More than one listener registered");

        listeners.set(name, async (event, arg: EventMessage<TRequest>) => {
            const {id: messageId} = arg;
            const abortController = abortControllerConstructor();

            function sendProgress(progress: TProgress) {
                communicate(event, sendFn, TYPE_PROGRESS, messageId, progress);
            }

            function handleAbort() {
                abortController.abort();
            }

            listenTo(TYPE_ABORT, messageId, handleAbort);

            try {
                const result = await respond(
                    arg.data,
                    sendProgress,
                    abortController.signal
                );

                communicate(event, sendFn, TYPE_COMPLETE, messageId, result);
            } catch (err) {
                communicate(event, sendFn, TYPE_ERROR, messageId, {
                    message: err.message,
                    stack: err.stack
                });

                log.warn(err, "An error occurred in an invocation");
            }

            stopListeningTo(TYPE_ABORT, messageId);
        });
    };
}

function sendImpl(
    sendFn: SendFunction,
    listenFn: ListenFunction,
    unlistenFn: ListenFunction
): InvokeHandler {
    const cache = new Map<string, unknown>();

    const {listenTo, stopListeningTo} = listenToComms(listenFn);

    return async function invoke<
        TResponse,
        TRequest = never,
        TProgress = never
    >(
        name: IpcName<TResponse, TRequest, TProgress>,
        arg?: TRequest,
        onProgress?: (progress: TProgress) => void,
        abort?: AbortSignal
    ): Promise<TResponse> {
        if (!name) throw new Error("IPC emitter name is not defined");

        const cacheKey = getCacheKey(name, arg);

        if (name.cache) {
            if (cache.has(cacheKey)) return cache.get(cacheKey) as TResponse;
        }

        const id = `message_${name.name}.${randomString(16)}` as const;

        let triggerComplete: (v: TResponse) => void;
        let triggerError: (error: Error) => void;

        function handleAbort(event: IpcEvent) {
            communicate(event, sendFn, TYPE_ABORT, id, undefined);
        }

        function handleProgress(arg: TProgress) {
            onProgress?.(arg);
        }

        function handleError(arg: Error | string) {
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

        function handleComplete(arg: TResponse) {
            triggerComplete(arg);
        }

        if (abort) abort.addEventListener("abort", handleAbort);

        listenTo(TYPE_PROGRESS, id, handleProgress);
        listenTo(TYPE_ERROR, id, handleError);
        listenTo(TYPE_COMPLETE, id, handleComplete);

        const promise = new Promise<TResponse>((yay, nay) => {
            triggerComplete = yay;
            triggerError = nay;
        });

        sendFn(MESSAGE_EVENT, {name: name.name, id, data: arg});

        return await promise.finally(function handleFinally() {
            if (abort) abort.removeEventListener("abort", handleAbort);

            stopListeningTo(TYPE_PROGRESS, id);
            stopListeningTo(TYPE_ERROR, id);
            stopListeningTo(TYPE_COMPLETE, id);
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
