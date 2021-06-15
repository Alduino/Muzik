import deepEqual from "fast-deep-equal";
import React, {
    createContext,
    MutableRefObject,
    PropsWithChildren,
    ReactElement,
    useContext,
    useEffect,
    useMemo,
    useRef
} from "react";
import {IpcName} from "../../../lib/ipc/common";
import {invoke} from "../../../lib/ipc/renderer";

// TODO: Remove these once TypeScript supports them
interface RequestIdleOptions {
    timeout?: number;
}

interface IdleDeadline {
    readonly didTimeout: boolean;
    timeRemaining(): DOMHighResTimeStamp;
}

declare type IdleCallbackHandle = number;

declare function requestIdleCallback(
    callback: (deadline: IdleDeadline) => void,
    options?: RequestIdleOptions
): IdleCallbackHandle;

export interface GlobalRpcOptions {
    /**
     * The minimum amount of milliseconds between refreshes
     */
    refreshInterval: number;

    /**
     * The minimum time until the next refresh that data will be immediately loaded on its first render.
     */
    instantCallThreshold: number;
}

interface IntervalHandler {
    readonly dataSetters: Set<(v: unknown) => void>;
    readonly errorSetters: Set<(v: Error) => void>;

    lastValue?: unknown;
    lastError?: Error;
    isEnabled: boolean;
}

type IntervalHandlerKey = `${string}::${string}`;

function createIntervalHandlerKey<Request>(
    name: IpcName<unknown, Request>,
    req: Request
): IntervalHandlerKey {
    return `${name.name}::${JSON.stringify(req)}` as const;
}

interface Context {
    intervalHandlers: Map<IntervalHandlerKey, IntervalHandler>;
    resultCache: Map<IntervalHandlerKey, unknown>;
    lastRefreshTime: MutableRefObject<number>;
    config: GlobalRpcOptions;
}

function throwNotSetup(): never {
    throw new Error("You forgot to wrap the app in <RpcConfigurator />!");
}

const RpcContext = createContext<Context>({
    get intervalHandlers() {
        return throwNotSetup();
    },
    get resultCache() {
        return throwNotSetup();
    },
    get lastRefreshTime() {
        return throwNotSetup();
    },
    get config() {
        return throwNotSetup();
    }
});
RpcContext.displayName = "RpcContext";

export const RpcConfigurator = ({
    refreshInterval,
    instantCallThreshold,
    children
}: PropsWithChildren<GlobalRpcOptions>): ReactElement => {
    const lastRefreshTime = useRef(-Infinity);

    const intervalHandlers = useMemo<Map<IntervalHandlerKey, IntervalHandler>>(
        () => new Map(),
        []
    );

    const resultCache = useMemo<Map<IntervalHandlerKey, unknown>>(
        () => new Map(),
        []
    );

    const configObject = useMemo<GlobalRpcOptions>(
        () => ({
            refreshInterval,
            instantCallThreshold
        }),
        [refreshInterval, instantCallThreshold]
    );

    const contextObject = useMemo<Context>(
        () => ({
            intervalHandlers,
            resultCache,
            lastRefreshTime,
            config: configObject
        }),
        [intervalHandlers, resultCache, lastRefreshTime, configObject]
    );

    return (
        <RpcContext.Provider value={contextObject}>
            {children}
        </RpcContext.Provider>
    );
};

interface UseIntervalHandlerOpts<Response> {
    refetchMultiplier: number;

    setData(v: Response): void;

    setError(v: Error): void;
}

class IntervalHandlerImpl<Response, Request> implements IntervalHandler {
    readonly dataSetters = new Set<(v: unknown) => void>();
    readonly errorSetters = new Set<(v: Error) => void>();
    lastError: Error;
    lastValue: unknown;
    isEnabled: boolean;

    constructor(
        private readonly refetchMultiplier: number,
        private readonly ipcName: IpcName<Response, Request>,
        private readonly req: Request,
        private readonly writeCache: (v: Response | undefined) => void,
        readCache: () => Response | undefined
    ) {
        this.lastValue = readCache();
        this.isEnabled = true;
        requestIdleCallback(() => this.beginCallback());
        this.isEnabled = this.refetchMultiplier !== 0;
    }

    private async callback() {
        try {
            const value = await invoke(this.ipcName, this.req);
            const isPreviousEqual = deepEqual(value, this.lastValue);
            this.lastError = undefined;
            this.lastValue = value;
            this.writeCache(value);
            if (!isPreviousEqual)
                for (const dataSetter of this.dataSetters) dataSetter(value);
        } catch (err) {
            this.lastValue = undefined;
            this.lastError = err;
            this.writeCache(undefined);
            for (const errorSetter of this.errorSetters) errorSetter(err);
        }
    }

    beginCallback() {
        if (!this.isEnabled) return;
        this.callback();

        setTimeout(() => {
            requestIdleCallback(() => {
                this.beginCallback();
            });
        }, this.refetchMultiplier * 1000);
    }
}

/**
 * Invokes the specified IPC function at an interval.
 * @remarks De-duplicates calls, will only call once per interval.
 * @param ipcName Name of the IPC event
 * @param req Data to pass to the event. Deeply compared.
 * @param refetchMultiplier How often to refetch, zero to disable refetching
 * @param setData Called with data when received, or undefined when there is an error
 * @param setError Called with error when received, or undefined when there is data
 */
export function useIntervalHandler<Response, Request>(
    ipcName: IpcName<Response, Request> | null,
    req: Request,
    {refetchMultiplier, setData, setError}: UseIntervalHandlerOpts<Response>
): void {
    const {intervalHandlers, resultCache, lastRefreshTime} = useContext(
        RpcContext
    );

    useEffect(() => {
        if (ipcName === null) {
            setData(undefined);
            setError(undefined);
            return;
        }

        const handlerKey = createIntervalHandlerKey(ipcName, req);

        const readCache = () => resultCache.get(handlerKey);
        const writeCache = (v: Response) => resultCache.set(handlerKey, v);

        if (!intervalHandlers.has(handlerKey)) {
            // create a new handler if it doesn't exist yet
            intervalHandlers.set(
                handlerKey,
                new IntervalHandlerImpl(
                    refetchMultiplier,
                    ipcName,
                    req,
                    writeCache,
                    readCache
                )
            );
        }

        const handler = intervalHandlers.get(handlerKey);
        handler.dataSetters.add(setData);
        handler.errorSetters.add(setError);

        if (handler.lastValue) setData(handler.lastValue as Response);
        if (handler.lastError) setError(handler.lastError);

        return () => {
            handler.dataSetters.delete(setData);
            handler.errorSetters.delete(setError);

            if (
                handler.dataSetters.size === 0 &&
                handler.errorSetters.size === 0
            ) {
                // delete the handler if nothing is using it
                handler.isEnabled = false;
                intervalHandlers.delete(handlerKey);
            }
        };
    }, [
        intervalHandlers,
        lastRefreshTime,
        req,
        refetchMultiplier,
        setData,
        setError
    ]);
}
