// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type IpcName<TResponse, TRequest = never, TProgress = never> = {
    name: string;
    cache: boolean;
};

export const MESSAGE_EVENT = "event";
export const MESSAGE_COMMUNICATION = "communication";

export const TYPE_PROGRESS = "progress";
export const TYPE_COMPLETE = "complete";
export const TYPE_ERROR = "error";
export const TYPE_ABORT = "abort";

export type EventType =
    | typeof TYPE_PROGRESS
    | typeof TYPE_COMPLETE
    | typeof TYPE_ERROR
    | typeof TYPE_ABORT;

export interface EventMessage<T> {
    name: string;
    id: string;
    data: T;
}

export function eventName<Id extends string, Type extends string>(
    id: Id,
    type: Type
): `${Id}:${Type}` {
    return `${id}:${type}` as const;
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
