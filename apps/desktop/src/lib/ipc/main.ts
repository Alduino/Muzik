import {ipcMain} from "electron";
import {randomBytes} from "crypto";
import {
    EventMessage,
    eventName,
    MESSAGE_EVENT,
    TYPE_ABORT,
    TYPE_COMPLETE,
    TYPE_ERROR,
    TYPE_PROGRESS
} from "./common";

export type Responder<TRequest, TResponse, TProgress> = (
    arg: TRequest,
    progress: (v: TProgress) => void,
    abort: AbortSignal
) => Promise<TResponse> | TResponse;

function randomString(length: number) {
    const bytes = randomBytes(Math.ceil(length / 2));
    return bytes.toString("hex").substring(0, length);
}

const currentListeners = new Set<string>();

export function handle<TResponse, TRequest = never, TProgress = never>(
    name: string,
    respond: Responder<TRequest, TResponse, TProgress>
): void {
    if (currentListeners.has(name))
        throw new Error("More than one listener registered");
    currentListeners.add(name);

    ipcMain.on(MESSAGE_EVENT, async (event, arg: EventMessage<TRequest>) => {
        if (arg.name !== name) return;

        const messageId = `message_${name}.${randomString(16)}`;

        event.returnValue = {
            messageId
        };

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
            event.reply(eventName(messageId, TYPE_ERROR), err);
        }

        ipcMain.off(eventName(messageId, TYPE_ABORT), handleAbort);
    });
}
