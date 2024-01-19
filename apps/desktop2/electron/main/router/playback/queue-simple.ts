import {trackQueue} from "../../core/TrackQueue.ts";
import {audioStream} from "../../core/audio-stream.ts";
import {observable, procedure} from "../../trpc.ts";
import {extend} from "../../utils/Observable.ts";
import {PLAYBACK_SAMPLE_RATE} from "../../../../shared/audio/constants.ts";

const RESTART_THRESHOLD_SECONDS = 5;

export const nextTrack = procedure.mutation(async () => {
    trackQueue.next();
});

export const previousTrack = procedure.mutation(async () => {
    if (audioStream.currentTrackPosition.get() < PLAYBACK_SAMPLE_RATE * RESTART_THRESHOLD_SECONDS) {
        audioStream.seek(0);
    } else {
        trackQueue.previous();
    }
});

export const canNextTrack$ = procedure.subscription(() => {
    return observable.observable<boolean>(observer => {
        observer.next(trackQueue.canNext.get());

        return trackQueue.canNext.onChange(canNext => {
            observer.next(canNext);
        });
    });
});

export const canPreviousTrack$ = procedure.subscription(() => {
    const canPrevious = extend(audioStream.currentTrackPosition, trackQueue.canPrevious).with((currentTrackPosition, canPrevious) => {
        if (canPrevious) return true;
        return currentTrackPosition >= PLAYBACK_SAMPLE_RATE * RESTART_THRESHOLD_SECONDS;
    });

    return observable.observable<boolean>(observer => {
        observer.next(canPrevious.get());

        return canPrevious.onChange(canPrevious => {
            observer.next(canPrevious);
        });
    });
});
