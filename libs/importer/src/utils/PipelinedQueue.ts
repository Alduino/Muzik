import {EventEmitter} from "./EventEmitter";

const PREPARE_CONCURRENCY = 1;

export interface PipelinedQueueHandler<Input, Context, Output> {
    // An IO-bound function that prepares the context for the next handler.
    prepare(input: Input): Promise<Context>;

    // A CPU-bound function that handles the context.
    process(input: Input, context: Context): Promise<Output>;
}

interface QueueItemContext<Input, Output> {
    input: Input;

    onCompleted: (output: Output) => void;
    onErrored: (error: unknown) => void;
}

export interface PipelinedQueueOptions {
    processConcurrency: number;
}

/**
 * A queue that is optimised for processing items with an IO-bound preparation step and a CPU-bound processing step.
 *
 * All IO-bound preparation steps are run in series, as parallelism can cause performance issues.
 * CPU-bound processing steps are run as parallel as possible, up to the concurrency limit.
 */
export class PipelinedQueue<Input, Context, Output> {
    readonly #prepareNext = new EventEmitter();
    readonly #processNext = new EventEmitter();

    readonly #prepareQueue: QueueItemContext<Input, Context>[] = [];
    readonly #processQueue: QueueItemContext<[Input, Context], Output>[] = [];

    #prepareActive = 0;
    #processActive = 0;

    constructor(
        private readonly handler: PipelinedQueueHandler<Input, Context, Output>,
        private readonly options: PipelinedQueueOptions
    ) {
        this.#prepareNext.listen(() => this.#handlePrepareNext());
        this.#processNext.listen(() => this.#handleProcessNext());
    }

    /**
     * @note Don't load lots of data into memory before this point, because it might be there for a while.
     *   Ideally, this call would be early in your function.
     */
    async run(input: Input): Promise<Output> {
        const context = await this.#prepare(input);
        return await this.#process(input, context);
    }

    runAll(inputs: Input[]): Promise<Output[]> {
        return Promise.all(inputs.map(input => this.run(input)));
    }

    #prepare(input: Input): Promise<Context> {
        return new Promise((resolve, reject) => {
            this.#prepareQueue.push({
                input,
                onCompleted: resolve,
                onErrored: reject
            });

            this.#prepareNext.emit();
        });
    }

    #process(input: Input, context: Context): Promise<Output> {
        return new Promise((resolve, reject) => {
            this.#processQueue.push({
                input: [input, context],
                onCompleted: resolve,
                onErrored: reject
            });

            this.#processNext.emit();
        });
    }

    async #handlePrepareNext() {
        if (this.#prepareActive >= PREPARE_CONCURRENCY) return;

        const item = this.#prepareQueue.shift();
        if (!item) return;

        this.#prepareActive++;

        try {
            const context = await this.handler.prepare(item.input);
            this.#prepareActive--;
            item.onCompleted(context);
        } catch (error) {
            this.#prepareActive--;
            item.onErrored(error);
        }

        this.#prepareNext.emit();
    }

    async #handleProcessNext() {
        if (this.#processActive >= this.options.processConcurrency) return;

        const item = this.#processQueue.shift();
        if (!item) return;

        this.#processActive++;

        try {
            const output = await this.handler.process(...item.input);
            this.#processActive--;
            item.onCompleted(output);
        } catch (error) {
            this.#processActive--;
            item.onErrored(error);
        }

        this.#processNext.emit();
    }
}
