import {useCallback, useMemo, useState} from "react";
import {IpcName} from "../../../lib/ipc/common";
import {useIntervalHandler} from "./RpcProvider";

export interface UseRpcOptions {
    /**
     * The minimum amount of seconds between refetching
     */
    refetchMultiplier: number;
}

export interface UseRpcResult<Response> {
    data?: Response;
    error?: Error;

    /**
     * Requests the data again
     */
    invalidate(): void;

    /**
     * Changes the data to a new value, and invalidates
     * @param data Data to use until request is complete
     * @param invalidate Trigger a new request after mutation. Default true.
     */
    mutate(data: Response, invalidate?: boolean): void;
}

interface UseRpc {
    /**
     * Sends an RPC request, with no data, to the specified event.
     * @param name - Event name, or null to ignore this render.
     * @param opts - RPC options
     */ <Response>(
        name: IpcName<Response> | null,
        opts: UseRpcOptions
    ): UseRpcResult<Response>;

    /**
     * Sends an RPC request to the specified event.
     * @param name - Event name, or null to ignore this render.
     * @param req - Data to send with the event
     * @param opts - RPC options
     */ <Response, Request>(
        name: IpcName<Response, Request> | null,
        req: Request,
        opts: UseRpcOptions
    ): UseRpcResult<Response>;
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

    const {invalidate} = useIntervalHandler(name, req, {
        refetchMultiplier,
        setData,
        setError
    });

    const mutate = useCallback(
        (data: Response, doInvalidate = true) => {
            setData(data);
            if (doInvalidate) invalidate();
        },
        [setData, invalidate]
    );

    return useMemo<UseRpcResult<Response>>(
        () => ({data, error, invalidate, mutate}),
        [data, error, invalidate, mutate]
    );
}) as UseRpc;

export default useRpc;
