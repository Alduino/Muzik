import {AsyncLocalStorage} from "async_hooks";
import {randomUUID} from "crypto";
import {isMainThread, TransferListItem} from "worker_threads";
import {log} from "../../../shared/logger.ts";

type MethodBase = (...params: never[]) => unknown;
type StrictMethodsBase = Record<string, MethodBase>;
type MethodsBase = Record<
    string,
    MethodBase | LazyMethod<MethodsBase, MethodBase>
>;

interface InternalRequest {
    type: "request";
    id: string;
    method: string;
    params: readonly never[];
    stack: string;
}

interface InternalResponse {
    type: "response";
    id: string;
    result?: unknown;
    error?: unknown;
}

interface MessageOptions {
    transferList?: readonly TransferListItem[];
    timeout?: number;
}

interface MessagePortLike {
    postMessage(
        message: InternalRequest | InternalResponse,
        transferList?: readonly TransferListItem[]
    ): void;

    on(
        event: "message",
        listener: (message: InternalRequest | InternalResponse) => void
    ): void;
}

const lazyMethodSymbol = Symbol();

interface LazyMethod<Methods extends MethodsBase, T extends MethodBase> {
    $$typeof: typeof lazyMethodSymbol;

    getMethod(rpc: RpcObject<Methods>): T;
}

type ProxyMethod<Method extends MethodBase> = (
    ...params: Parameters<Method>
) => Promise<Awaited<ReturnType<Method>>>;

type Cast<T, U> = T extends U ? T : U;

type ProxiedMethods<Methods extends MethodsBase> = {
    [K in keyof Methods]: Methods[K] extends LazyMethod<Methods, infer T>
        ? ProxyMethod<T>
        : ProxyMethod<Cast<Methods[K], MethodBase>>;
};

interface WithOptions<Methods extends MethodsBase> {
    withOptions(options: MessageOptions): ProxiedMethods<Methods>;
}

interface CreateRpcResult<Methods extends MethodsBase> {
    rpc: ProxiedMethods<Methods> & WithOptions<Methods>;

    attachPort(port: MessagePortLike): void;
}

type RpcObject<Methods extends MethodsBase> = ProxiedMethods<Methods> &
    WithOptions<Methods>;

const stackTraceContext = new AsyncLocalStorage<{stack: string}>;

export function createRpc<Methods extends MethodsBase>(
    messageHandlers: MethodsBase
): CreateRpcResult<Methods> {
    const messageReceivers = new Map<
        string,
        (response: InternalResponse) => void
    >();

    let messagePort: MessagePortLike | null = null;
    let loadedMessageHandlers: StrictMethodsBase | null = null;

    function attachTo(port: MessagePortLike) {
        log.debug(
            "%s thread attached to port",
            isMainThread ? "Main" : "Worker"
        );

        messagePort = port;

        loadedMessageHandlers = Object.fromEntries(
            Object.entries(messageHandlers).map(([key, value]) => {
                if (typeof value === "function") {
                    return [key, value];
                }

                return [key, value.getMethod(rpc)];
            })
        );

        port.on(
            "message",
            async (message: InternalRequest | InternalResponse) => {
                if (message.type === "response") {
                    const receiver = messageReceivers.get(message.id);
                    receiver?.(message);
                    return;
                }

                try {
                    if (!loadedMessageHandlers) {
                        log.warn({isMainThread}, "No message handlers loaded");
                        throw new Error("No message port attached");
                    }

                    const handler = loadedMessageHandlers[message.method];

                    if (!handler) {
                        log.warn(
                            {method: message.method, isMainThread},
                            "No handler for method"
                        );

                        throw new Error(
                            `No handler for method ${message.method}`
                        );
                    }

                    const result = await stackTraceContext.run({stack: message.stack}, async () => {
                        return await handler(...message.params);
                    });

                    port.postMessage({
                        type: "response",
                        id: message.id,
                        result
                    } satisfies InternalResponse);
                } catch (err) {
                    log.warn(
                        {
                            method: message.method,
                            id: message.id,
                            error: err,
                            isMainThread
                        },
                        "Send WorkerRPC error"
                    );

                    port.postMessage({
                        type: "response",
                        id: message.id,
                        error: err
                    } satisfies InternalResponse);
                }
            }
        );
    }

    let devMemoryLeakStackTraceCache: Set<string>;

    if (import.meta.env.DEV) {
        devMemoryLeakStackTraceCache = new Set();
    }

    function createProxy(options: MessageOptions = {}) {
        return new Proxy(
            {},
            {
                get(_, prop: string) {
                    if (prop === "withOptions") {
                        return (newOptions: MessageOptions) => {
                            return createProxy({
                                ...options,
                                ...newOptions
                            });
                        };
                    }

                    const caller = (...params: readonly unknown[]) => {
                        if (!messagePort) {
                            log.warn("No message port attached");
                            throw new Error("No message port attached");
                        }

                        const messageId = randomUUID();

                        let stack: string = "(stack unavailable in production)";

                        if (import.meta.env.DEV) {
                            stack = new Error().stack!.split("\n").slice(1).join("\n");
                            stack += "\n--- caller thread stack ---\n";
                            stack += (stackTraceContext.getStore()?.stack ?? "    (start)");
                        }

                        const promise = new Promise((resolve, reject) => {
                            let timeout: NodeJS.Timeout | null = null;

                            messageReceivers.set(
                                messageId,
                                (response: InternalResponse) => {
                                    messageReceivers.delete(messageId);
                                    if (timeout) clearTimeout(timeout);

                                    if (response.error) {
                                        reject(response.error);
                                    } else {
                                        resolve(response.result);
                                    }
                                }
                            );

                            if (import.meta.env.DEV && messageReceivers.size > 1000) {
                                const stackError = new Error("Stack trace");
                                stackError.stack = stack;
                                const stackTrace = stackError.stack ?? "???";

                                if (!devMemoryLeakStackTraceCache.has(stackTrace)) {
                                    devMemoryLeakStackTraceCache.add(stackTrace);
                                    log.warn({
                                        method: prop,
                                        stackError
                                    }, "WorkerRPC message receiver map is getting large; lots of requests without responses?");
                                }
                            }

                            if (options.timeout) {
                                timeout = setTimeout(() => {
                                    messageReceivers.delete(messageId);

                                    reject(new Error("Request timed out"));
                                }, options.timeout);
                            }
                        });

                        messagePort.postMessage(
                            {
                                type: "request",
                                id: messageId,
                                method: prop,
                                params: params as never[],
                                stack
                            } satisfies InternalRequest,
                            options.transferList
                        );

                        return promise;
                    };

                    if (import.meta.env.DEV) {
                        Object.defineProperty(caller, "name", {
                            value: `rpc:${prop}`
                        });
                    }

                    return caller;
                }
            }
        ) as ProxiedMethods<Methods> & WithOptions<Methods>;
    }

    const rpc = createProxy();

    return {
        attachPort: attachTo,
        rpc
    };
}

export function lazyMethod<Methods extends MethodsBase, T extends MethodBase>(
    callback: (rpc: RpcObject<Methods>) => T
): LazyMethod<Methods, T> {
    return {
        $$typeof: lazyMethodSymbol,
        getMethod: callback
    };
}

export type InferMethods<T extends MethodsBase> = T;
