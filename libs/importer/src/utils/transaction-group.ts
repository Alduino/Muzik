import {Kysely, Transaction} from "kysely";

export interface TransactionGroupContext<Db> {
    /**
     * Returns the current transaction.
     * Changes are applied with `ctx.commit()`, or when the callback returns.
     */
    trx(): Transaction<Db>;

    /**
     * Commits the current transaction and starts a new one.
     */
    commit(): Promise<void>;
}

function createControlledPromise() {
    let resolve: () => void;
    let reject: (err: Error) => void;

    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return {
        promise,
        resolve: resolve!,
        reject: reject!
    };
}

interface TransactionState<Db> {
    trx: Transaction<Db>;
    commit(): Promise<void>;
    rollback(error: Error): Promise<void>;
}

export async function inTransactionGroup<Db>(db: Kysely<Db>, callback: (ctx: TransactionGroupContext<Db>) => Promise<void>) {
    let state: TransactionState<Db> | null = null;

    async function startTransaction() {
        const {promise: trxComplete, resolve: commitTrx, reject: rollbackTrx} = createControlledPromise();
        const {promise: trxLoaded, resolve: setTrxLoaded} = createControlledPromise();

        let transaction: Transaction<Db>;

        const transactionPromise = db.transaction().execute(trx => {
            transaction = trx;
            setTrxLoaded();
            return trxComplete;
        });

        await trxLoaded;

        function commit() {
            commitTrx();
            return transactionPromise;
        }

        function rollback(error: Error) {
            rollbackTrx(error);
            return transactionPromise;
        }

        state = {
            trx: transaction!,
            commit,
            rollback
        };
    }

    const ctx: TransactionGroupContext<Db> = {
        trx() {
            if (state === null) throw new Error("Not in transaction group");
            return state.trx;
        },
        async commit() {
            if (state === null) throw new Error("Not in transaction group");
            const {commit} = state;
            await startTransaction();
            return commit();
        }
    };

    await startTransaction();

    try {
        await callback(ctx);
        await state?.commit();
    } catch (err) {
        await state?.rollback(err);
        throw err;
    }
}
