import {EventEmitter} from "./EventEmitter.ts";

export class SubscribableState<T> {
    readonly #eventEmitter = new EventEmitter<[T, T]>();
    #value: T;

    constructor(value: T) {
        this.#value = value;
    }

    onChange(handler: (value: T, previousValue: T) => void) {
        return this.#eventEmitter.listen(handler);
    }

    get() {
        return this.#value;
    }

    set(value: T | ((previousValue: T) => T)) {
        const previousValue = this.#value;
        const newValue =
            typeof value === "function"
                ? (value as (previousValue: T) => T)(previousValue)
                : value;

        if (newValue !== previousValue) {
            this.#value = newValue;
            this.#eventEmitter.emit(newValue, previousValue);
        }
    }
}
