import {router} from "../../trpc.ts";
import {getCurrentTrack$} from "./current-track.ts";
import {watchFrequencyBins$} from "./frequency-bins.ts";
import {isPlaying$, play} from "./playback-state.ts";
import {canNextTrack$, canPreviousTrack$, nextTrack, previousTrack} from "./queue-simple.ts";
import {getCurrentSeekPosition$, setCurrentSeekPosition} from "./seeking.ts";

export const playback = router({
    getCurrentTrack$,
    play,
    isPlaying$,
    getCurrentSeekPosition$,
    setCurrentSeekPosition,
    nextTrack,
    previousTrack,
    canNextTrack$,
    canPreviousTrack$,
    watchFrequencyBins$
});
