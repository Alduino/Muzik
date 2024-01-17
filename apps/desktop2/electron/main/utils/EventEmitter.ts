import {log} from "../../../shared/logger.ts";

export interface EventListener {
    listen(handler: () => void): () => void;
    listenOnce(handler: () => void): () => void;
}

export class EventEmitter<Args extends unknown[] = []> {
    #handlers = new Set<(...args: Args) => void>();

    #notEmptyEmitter: EventEmitter | null = null;
    #emptyEmitter: EventEmitter | null = null;

    get unempty(): EventEmitter {
        if (!this.#notEmptyEmitter) {
            this.#notEmptyEmitter = new EventEmitter();
        }

        return this.#notEmptyEmitter;
    }

    get empty(): EventEmitter {
        if (!this.#emptyEmitter) {
            this.#emptyEmitter = new EventEmitter();
        }

        return this.#emptyEmitter;
    }

    listen(handler: (...args: Args) => void) {
        this.#handlers.add(handler);

        if (this.#handlers.size === 1) {
            this.#notEmptyEmitter?.emit();
        }

        return () => {
            this.#handlers.delete(handler);

            if (this.#handlers.size === 0) {
                this.#emptyEmitter?.emit();
            }
        };
    }

    listenOnce(handler: (...args: Args) => void) {
        const unsubscribe = this.listen((...args) => {
            unsubscribe();
            handler(...args);
        });

        return unsubscribe;
    }

    emit(...args: Args) {
        for (const handler of this.#handlers) {
            try {
                const result = handler(...args) as unknown;

                if (result instanceof Promise) {
                    result.catch(err => {
                        log.warn(
                            err,
                            "Caught an async error while emitting an event"
                        );
                    });
                }
            } catch (err) {
                log.warn(err, "Caught an error while emitting an event");
            }
        }
    }

    getListener(): EventListener {
        return this;
    }
}
