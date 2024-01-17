import {childLogger} from "../../../shared/logger.ts";
import {extend, observable} from "../utils/Observable.ts";

const log = childLogger("track-queue");

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
    readonly nextTrack = extend(this.currentTrack, this.immediateQueue).with((currentTrack, immediateQueue) => {
        if (immediateQueue.length > 0) return immediateQueue[0];
        if (currentTrack != null) return currentTrack + 1;
        return null;
    });

    readonly canPrevious = this.lastTrack.extend(
        lastTrack => lastTrack !== null
    );

    readonly canNext = this.nextTrack.extend(nextTrack => nextTrack !== null);
    // FOR TESTING:
    //readonly canNext = this.currentTrack.extend(() => true);

    constructor() {}

    unshiftToImmediateQueue(track: number) {
        this.#immediateQueue.set([...this.immediateQueue.get(), track]);
    }

    pushToImmediateQueue(track: number) {
        this.#immediateQueue.set([track, ...this.immediateQueue.get()]);
    }

    async previous() {
        if (!this.canPrevious.get()) {
            log.info("Attempted to go to the previous track but there is no history");
            return;
        }

        const currentTrack = this.currentTrack.get();
        if (currentTrack === null) {
            log.info("Attempted to go to the previous track but there is no current track");
            return;
        }

        this.unshiftToImmediateQueue(currentTrack);

        const history = this.history.get();
        const lastTrack = history.at(-1)!;
        log.info({trackId: lastTrack}, "Went to the previous track");
        this.#history.set(history.slice(0, -1));
        this.#currentTrack.set(lastTrack);
    }

    next() {
        if (!this.canNext.get()) {
            log.info("Attempted to go to the next track but there is no next track");
            return;
        }

        const nextTrack = this.nextTrack.get()!;
        const [firstTrackInQueue, ...rest] = this.immediateQueue.get();
        const currentTrack = this.currentTrack.get();
        log.info({trackId: nextTrack}, "Went to the next track");

        // Set order must be last -> current -> next,
        // so that the current and next tracks don't get unloaded.

        if (currentTrack !== null) {
            this.#history.set([...this.history.get(), currentTrack]);
        }

        this.#currentTrack.set(nextTrack);
        if (nextTrack === firstTrackInQueue) this.#immediateQueue.set(rest);
    }
}

export const trackQueue = new TrackQueue();
