import {observable} from "../utils/Observable.ts";

export class TrackQueue {
    #currentTrack = observable<number | null>(null);
    readonly currentTrack = this.#currentTrack.observable();

    #history = observable<readonly number[]>([]);
    readonly history = this.#history.observable();

    #immediateQueue = observable<readonly number[]>([]);
    readonly immediateQueue = this.#immediateQueue.observable();

    readonly lastTrack = this.history.extend(history => history.at(-1) ?? null);

    /*readonly nextTrack = this.immediateQueue.extend(
        queue => queue.at(0) ?? null
    );*/

    // FOR TESTING:
    readonly nextTrack = this.currentTrack.extend(currentTrack =>
        currentTrack ? currentTrack + 1 : null
    );

    readonly canPrevious = this.lastTrack.extend(
        lastTrack => lastTrack !== null
    );

    //readonly canNext = this.nextTrack.extend(nextTrack => nextTrack !== null);
    // FOR TESTING:
    readonly canNext = this.currentTrack.extend(() => true);

    constructor() {}

    unshiftToImmediateQueue(track: number) {
        this.#immediateQueue.set([...this.immediateQueue.get(), track]);
    }

    pushToImmediateQueue(track: number) {
        this.#immediateQueue.set([track, ...this.immediateQueue.get()]);
    }

    async previous() {
        if (!this.canPrevious.get()) return;

        const currentTrack = this.currentTrack.get();
        if (currentTrack === null) return;

        this.unshiftToImmediateQueue(currentTrack);

        const history = this.history.get();
        const lastTrack = history.at(-1)!;
        this.#history.set(history.slice(0, -1));
        this.#currentTrack.set(lastTrack);
    }

    next() {
        if (!this.canNext.get()) return;

        const [nextTrack, ...rest] = this.immediateQueue.get();
        this.#immediateQueue.set(rest);

        const currentTrack = this.currentTrack.get();
        if (currentTrack !== null) {
            this.#history.set([...this.history.get(), currentTrack]);
        }

        this.#currentTrack.set(nextTrack);
    }
}

export const trackQueue = new TrackQueue();
