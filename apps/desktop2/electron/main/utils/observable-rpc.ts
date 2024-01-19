import {randomUUID} from "crypto";
import {EventEmitter} from "./EventEmitter.ts";
import {extend, Observable} from "./Observable.ts";
import {lazyMethod} from "./worker-rpc.ts";

type ExposeKey<U extends string> = `[fake observable marker value] ${U}`;

type SimpleExposeResult = Record<string, (...args: never[]) => unknown>;

type ExposeResult<UniqueId extends string, T> = Record<
    ExposeKey<UniqueId>,
    () => T
>;

type ExposedUniqueIds<RecordKeys extends string> = RecordKeys extends ExposeKey<
    infer UniqueId
>
    ? UniqueId
    : never;
type ExposedType<
    UniqueId extends string,
    Rpc extends ExposeResult<UniqueId, unknown>
> = Rpc[ExposeKey<UniqueId>] extends () => infer T ? T : never;

function getMethodName(uniqueId: string, name: string) {
    return `observable-rpc://${uniqueId}/${name}`;
}

const methods = {
    subscribe: "subscribe",
    unsubscribe: "unsubscribe",
    sendUpdate: "sendUpdate"
};

export function exposeObservable<UniqueId extends string, T>(
    uniqueId: UniqueId,
    observable: Observable<T>
): ExposeResult<UniqueId, T> {
    const unsubscribers = new Map<string, () => void>();

    return {
        [getMethodName(uniqueId, methods.subscribe)]: lazyMethod(
            rpc => (subscriptionId: string) => {
                const sendUpdates =
                    rpc[getMethodName(uniqueId, methods.sendUpdate)];

                // @ts-expect-error Properly typing this would be a pain
                sendUpdates(observable.get());

                const unsubscribe = observable.onChange(value => {
                    // @ts-expect-error Properly typing this would be a pain
                    sendUpdates(value);
                });

                unsubscribers.set(subscriptionId, unsubscribe);
            }
        ),
        [getMethodName(uniqueId, methods.unsubscribe)]: lazyMethod(
            () => (subscriptionId: string) => {
                const unsubscribe = unsubscribers.get(subscriptionId);

                if (unsubscribe) {
                    unsubscribe();
                    unsubscribers.delete(subscriptionId);
                }
            }
        )
    } as never;
}

type Cast<T, U> = T extends U ? T : U;

type ConsumeObservableResult<
    UniqueId extends ExposedUniqueIds<Cast<keyof RpcMethods, string>>,
    RpcMethods extends SimpleExposeResult,
    InitialValue = ExposedType<UniqueId, RpcMethods>
> = Observable<ExposedType<UniqueId, RpcMethods> | InitialValue> & {
    rpcExtension: Record<string, never>;
};

export interface ConsumeObservableInitialResult<
    ExposeMethods extends SimpleExposeResult
> {
    <
        UniqueId extends ExposedUniqueIds<Cast<keyof ExposeMethods, string>>,
        InitialValue = ExposedType<UniqueId, ExposeMethods>
    >(
        uniqueId: UniqueId,
        initialValue: InitialValue
    ): ConsumeObservableResult<UniqueId, ExposeMethods, InitialValue>;
}

/**
 * Consumes an observable exposed by `exposeObservable` over RPC.
 *
 * To allow proper communication between consumer and producer,
 * add `...consumeObservable()().rpcExtension` to the RPC methods exposed by the consumer to the producer.
 */
export function consumeObservable<
    ExposeMethods extends SimpleExposeResult
>(): ConsumeObservableInitialResult<ExposeMethods> {
    return <
        UniqueId extends ExposedUniqueIds<Cast<keyof ExposeMethods, string>>,
        InitialValue = ExposedType<UniqueId, ExposeMethods>
    >(
        uniqueId: UniqueId,
        initialValue: InitialValue
    ): ConsumeObservableResult<UniqueId, ExposeMethods, InitialValue> => {
        type Value = ExposedType<UniqueId, ExposeMethods> | InitialValue;

        const subscriptionId = randomUUID();

        const updates = new EventEmitter<[Value, Value]>();
        const rpcConnected = new EventEmitter<[]>();

        let currentValue: Value = initialValue;
        let rpc: SimpleExposeResult | null = null;

        const rpcExtension = {
            [getMethodName(uniqueId, methods.sendUpdate)]: lazyMethod(
                rpcObj => {
                    rpc = rpcObj;
                    rpcConnected.emit();

                    return (value: ExposedType<UniqueId, ExposeMethods>) => {
                        const previousValue = currentValue;
                        currentValue = value;
                        updates.emit(value, previousValue);
                    };
                }
            )
        };

        updates.unempty.listen(() => {
            if (!rpc) throw new Error("RPC not attached");

            // @ts-expect-error Properly typing this would be a pain
            rpc[getMethodName(uniqueId, methods.subscribe)](subscriptionId);
        });

        updates.empty.listen(() => {
            if (!rpc) throw new Error("RPC not attached");

            // @ts-expect-error Properly typing this would be a pain
            rpc[getMethodName(uniqueId, methods.unsubscribe)](subscriptionId);
        });

        // Need to always stay subscribed so get() works synchronously.
        // TODO: Have some way to unsubscribe when the observable is no longer used.
        rpcConnected.listenOnce(() => {
            updates.listen(() => {});
        });

        return {
            onChange(handler) {
                return updates.listen(handler);
            },
            onChangeOnce(handler) {
                return updates.listenOnce(handler);
            },
            get() {
                return currentValue;
            },
            extend(transformer) {
                return extend(this).with(transformer);
            },
            rpcExtension: rpcExtension as never
        };
    };
}
