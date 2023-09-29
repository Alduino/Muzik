export class EventEmitter<
    Handler extends (...args: unknown[]) => void = () => void
> {
    #handlers = new Set<Handler>();

    listen(handler: Handler) {
        this.#handlers.add(handler);
    }

    emit(...args: Parameters<Handler>) {
        for (const handler of this.#handlers) {
            handler(...args);
        }
    }
}
