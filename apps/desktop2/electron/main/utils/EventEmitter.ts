export class EventEmitter<Args extends unknown[]> {
    #handlers = new Set<(...args: Args) => void>();

    listen(handler: (...args: Args) => void) {
        this.#handlers.add(handler);
        return () => this.#handlers.delete(handler);
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
            handler(...args);
        }
    }
}
