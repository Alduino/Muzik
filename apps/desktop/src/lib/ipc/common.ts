// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type IpcName<TResponse, TRequest = never, TProgress = never> = [string];

export function readIpcName(name: IpcName<unknown>) {
    return name[0];
}

export const MESSAGE_EVENT = "event";
export const TYPE_PROGRESS = "progress";
export const TYPE_COMPLETE = "complete";
export const TYPE_ERROR = "error";
export const TYPE_ABORT = "abort";

export interface EventMessage<T> {
    name: string;
    id: string;
    data: T;
}

export function eventName(id: string, type: string) {
    return `${id}:${type}`;
}
