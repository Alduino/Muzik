import {EventEmitter} from "./EventEmitter.ts";

type Lazy<T> = (() => T) & {set: (value: T) => void};

function lazy<T>(loader: () => T): Lazy<T> {
    let value: T | null = null;

    const result = () => {
        if (value === null) {
            value = loader();
        }

        return value;
    };

    (result as Lazy<T>).set = newValue => {
        value = newValue;
    };

    return result as Lazy<T>;
}

interface ObservableInterface<T> {
    getValue(): T;

    setListener(handler: ((value: T, previousValue: T) => void) | null): void;
}

export interface Observable<T> {
    get(): T;

    onChange(handler: (value: T, previousValue: T) => void): () => void;

    extend<U>(transformer: (value: T) => U): Observable<U>;
}

class ObservableImpl<T> implements Observable<T> {
    #listener = new EventEmitter<[T, T]>();

    constructor(private readonly observableInterface: ObservableInterface<T>) {
        this.#listener.unempty.listen(() => {
            this.observableInterface.setListener((newValue, previousValue) => {
                this.#listener.emit(newValue, previousValue);
            });
        });

        this.#listener.empty.listen(() => {
            this.observableInterface.setListener(null);
        });
    }

    get() {
        return this.observableInterface.getValue();
    }

    onChange(handler: (value: T, previousValue: T) => void) {
        return this.#listener.listen(handler);
    }

    extend<U>(transformer: (value: T) => U): Observable<U> {
        return extend(this).with(transformer);
    }
}

export class ExtendedObservable<T> {
    #currentValue = lazy(() => this.#getValue());

    #cleanup = new EventEmitter();

    readonly #observable = new ObservableImpl<T>({
        getValue: () => this.#currentValue(),
        setListener: handler => this.#setChangeHandler(handler)
    });

    #dependencies = lazy(() => this.dependenciesLoader());

    constructor(
        private readonly dependenciesLoader: () => readonly Observable<unknown>[],
        private readonly transformer: (...values: unknown[]) => T
    ) {}

    observable(): Observable<T> {
        return this.#observable;
    }

    #getDependencyValues() {
        return this.#dependencies().map(dependency => dependency.get());
    }

    #getValue() {
        return this.transformer(...this.#getDependencyValues());
    }

    #setChangeHandler(handler: ((curr: T, prev: T) => void) | null) {
        this.#cleanup.emit();

        if (handler) {
            for (const dependency of this.#dependencies()) {
                const cleanup = dependency.onChange(() => {
                    const newValue = this.#getValue();
                    const previousValue = this.#currentValue();
                    this.#currentValue.set(newValue);

                    handler(newValue, previousValue);
                });

                this.#cleanup.listenOnce(cleanup);
            }
        }
    }
}

export class ObservableController<T> {
    #value: T;
    #observableListener: ((curr: T, prev: T) => void) | null = null;

    readonly #observable = new ObservableImpl<T>({
        getValue: () => this.#value,
        setListener: handler => {
            this.#observableListener = handler;
        }
    });

    constructor(initialValue: T) {
        this.#value = initialValue;
    }

    set(newValue: T) {
        const previousValue = this.#value;
        this.#value = newValue;
        this.#observableListener?.(newValue, previousValue);
    }

    observable(): Observable<T> {
        return this.#observable;
    }
}

export function observable<T>(initialValue: T) {
    return new ObservableController(initialValue);
}

type ObservablesFor<Values extends readonly unknown[]> = Readonly<{
    [Index in keyof Values]:
        | Observable<Values[Index]>
        | (() => Observable<Values[Index]>);
}>;

interface ExtendIntermediate<ObservableValues extends readonly unknown[]> {
    with: <Result>(
        transformer: (...values: ObservableValues) => Result
    ) => Observable<Result>;
}

/**
 * Extends the given dependencies with a transformer function and returns an extended observable.
 * Each dependency's value gets passed to the transformer function as an argument, in order.
 *
 * @param {Array} dependencies - The dependencies to extend.
 *  To work around circular dependencies, items can be a function that returns the observable.
 *  The function gets evaluated the first time the observable is used.
 *
 * @returns {object} - An object with a `with` method that takes a transformer function and returns an extended observable.
 */
export function extend<ObservableValues extends readonly unknown[]>(
    ...dependencies: ObservablesFor<ObservableValues>
): ExtendIntermediate<ObservableValues> {
    const getDependencies = () => {
        return dependencies.map(dependency => {
            if (typeof dependency === "function") {
                return dependency();
            }

            return dependency;
        });
    };

    return {
        with<Result>(transformer: (...values: ObservableValues) => Result) {
            return new ExtendedObservable<Result>(
                () => getDependencies(),
                transformer as never
            ).observable();
        }
    };
}

export function arr<T extends readonly unknown[]>(...values: T) {
    return values;
}
