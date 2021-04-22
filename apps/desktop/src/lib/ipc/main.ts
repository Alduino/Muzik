import AbortController, {AbortSignal} from "node-abort-controller";
import {ipcMain, IpcMainEvent} from "electron";
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
import {log} from "../../node/logger";

export type Responder<TRequest, TResponse, TProgress> = (
    arg: TRequest,
    progress: (v: TProgress) => void,
    abort: AbortSignal
) => Promise<TResponse> | TResponse;

type HandlerFn = (
    event: IpcMainEvent,
    arg: EventMessage<unknown>
) => Promise<void>;
const listeners = new Map<string, HandlerFn>();

ipcMain.on(MESSAGE_EVENT, (event, arg: EventMessage<unknown>) => {
    const {name, id} = arg;
    if (listeners.has(name)) {
        listeners.get(name)(event, arg);
    } else {
        console.warn("Received unknown event", name);
        event.reply(
            eventName(id, TYPE_ERROR),
            new Error(`Invalid event ${name}`)
        );
    }
});

export function handle<TResponse, TRequest = never, TProgress = never>(
    event: IpcName<TResponse, TRequest, TProgress>,
    respond: Responder<TRequest, TResponse, TProgress>
): void {
    const {name} = event;

    if (listeners.has(name))
        throw new Error("More than one listener registered");

    listeners.set(name, async (event, arg: EventMessage<TRequest>) => {
        const messageId = arg.id;

        const progressSender = (progress: TProgress) => {
            event.reply(eventName(messageId, TYPE_PROGRESS), progress);
        };

        const abortController = new AbortController();

        function handleAbort() {
            abortController.abort();
        }

        ipcMain.on(eventName(messageId, TYPE_ABORT), handleAbort);

        try {
            const result = await respond(
                arg.data,
                progressSender,
                abortController.signal
            );

            event.reply(eventName(messageId, TYPE_COMPLETE), result);
        } catch (err) {
            event.reply(eventName(messageId, TYPE_ERROR), {
                message: err.message,
                stack: err.stack
            });
            log.warn({stack: err.stack}, "An error occurred in an invocation");
        }

        ipcMain.off(eventName(messageId, TYPE_ABORT), handleAbort);
    });
}
