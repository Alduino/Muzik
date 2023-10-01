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
}

interface InternalResponse {
    type: "response";
    id: string;
    result?: unknown;
    error?: unknown;
}

interface MessageOptions {
    transferList?: readonly TransferListItem[];
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
    attachPort(port: MessagePortLike): void;

    rpc: ProxiedMethods<Methods> & WithOptions<Methods>;
}

type RpcObject<Methods extends MethodsBase> = ProxiedMethods<Methods> &
    WithOptions<Methods>;

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
                    log.trace({id: message.id}, "Recv WorkerRPC response");

                    const receiver = messageReceivers.get(message.id);
                    receiver?.(message);
                    return;
                }

                try {
                    if (!loadedMessageHandlers) {
                        log.warn("No message handlers loaded");
                        throw new Error("No message port attached");
                    }

                    const handler = loadedMessageHandlers[message.method];

                    if (!handler) {
                        log.warn(
                            {method: message.method},
                            "No handler for method"
                        );

                        throw new Error(
                            `No handler for method ${message.method}`
                        );
                    }

                    log.trace(
                        {method: message.method, id: message.id},
                        "Recv WorkerRPC request"
                    );

                    const result = await handler(...message.params);

                    log.trace(
                        {method: message.method, id: message.id},
                        "Send WorkerRPC response"
                    );

                    port.postMessage({
                        type: "response",
                        id: message.id,
                        result
                    } satisfies InternalResponse);
                } catch (err) {
                    log.trace(
                        {method: message.method, id: message.id, error: err},
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

                    return (...params: readonly unknown[]) => {
                        if (!messagePort) {
                            log.warn("No message port attached");
                            throw new Error("No message port attached");
                        }

                        const messageId = randomUUID();

                        log.trace(
                            {method: prop, id: messageId},
                            "Send WorkerRPC request"
                        );

                        messagePort.postMessage(
                            {
                                type: "request",
                                id: messageId,
                                method: prop,
                                params: params as never[]
                            } satisfies InternalRequest,
                            options.transferList
                        );

                        return new Promise((resolve, reject) => {
                            messageReceivers.set(
                                messageId,
                                (response: InternalResponse) => {
                                    messageReceivers.delete(messageId);

                                    if (response.error) {
                                        reject(response.error);
                                    } else {
                                        resolve(response.result);
                                    }
                                }
                            );
                        });
                    };
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
