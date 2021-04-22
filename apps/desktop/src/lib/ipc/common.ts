// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type IpcName<TResponse, TRequest = never, TProgress = never> = {
    name: string;
    cache: boolean;
};

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

export function g<TResponse, TRequest = never, TProgress = never>(
    name: string,
    cache = false
): IpcName<TResponse, TRequest, TProgress> {
    return {
        name,
        cache
    };
}
