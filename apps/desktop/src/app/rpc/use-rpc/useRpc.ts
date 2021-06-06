import {useMemo, useState} from "react";
import {IpcName} from "../../../lib/ipc/common";
import {useIntervalHandler} from "./RpcProvider";

export interface UseRpcOptions {
    /**
     * Multiplier of global `refetchInterval` option. Set to zero to disable refetch.
     * @remarks Must not change over multiple invocations, i.e. every call with the same IpcName and data must have the same `refetchMultiplier`.
     * @example
     * refreshInterval=1000ms
     * refetchMultiple=1 // refresh every second
     * refetchMultiple=2 // refresh every 2 seconds
     * refetchMultiple=0 // never refetch
     */
    refetchMultiplier: number;
}

export interface UseRpcResult<Response, Request> {
    data?: Response;
    error?: Error;
}

interface UseRpc {
    /**
     * Sends an RPC request, with no data, to the specified event.
     * @param name - Event name, or null to ignore this render.
     * @param opts - RPC options
     */ <Response>(
        name: IpcName<Response> | null,
        opts: UseRpcOptions
    ): UseRpcResult<Response, never>;

    /**
     * Sends an RPC request to the specified event.
     * @param name - Event name, or null to ignore this render.
     * @param req - Data to send with the event
     * @param opts - RPC options
     */ <Response, Request>(
        name: IpcName<Response, Request> | null,
        req: Request,
        opts: UseRpcOptions
    ): UseRpcResult<Response, Request>;
}

function isRpcOptions(value: unknown): value is UseRpcOptions {
    if (!value) return false;
    return typeof (value as UseRpcOptions).refetchMultiplier === "number";
}

const useRpc = (<Response, Request>(
    name: IpcName<Response, Request> | null,
    req_opts: Request | UseRpcOptions,
    opts: UseRpcOptions
) => {
    if (isRpcOptions(req_opts)) {
        opts = req_opts;
        req_opts = null;
    }
    const req = req_opts as Request;
    const {refetchMultiplier} = opts;

    const [data, setData] = useState<Response | undefined>();
    const [error, setError] = useState<Error | undefined>();

    useIntervalHandler(name, req, {
        refetchMultiplier,
        setData,
        setError
    });

    return useMemo<UseRpcResult<Response, Request>>(() => ({data, error}), [
        data,
        error
    ]);
}) as UseRpc;

export default useRpc;
