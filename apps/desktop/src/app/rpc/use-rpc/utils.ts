import {IpcName} from "../../../lib/ipc/common";
import {UseRpcResult} from "./useRpc";

type Result<T> = UseRpcResult<T, Error>;

export type NameResult<NameType> = NameType extends IpcName<
    infer TResponse,
    unknown,
    unknown
>
    ? Result<TResponse>
    : NameType extends (...args: unknown[]) => Promise<infer TResponse>
    ? Result<TResponse>
    : never;
