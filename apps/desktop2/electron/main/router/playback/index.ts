import {router} from "../../trpc.ts";
import {getCurrentTrack} from "./current-track.ts";
import {play} from "./playback-state.ts";
import {getCurrentSeekPosition, setCurrentSeekPosition} from "./seeking.ts";

export const playback = router({
    getCurrentTrack,
    play,
    getCurrentSeekPosition,
    setCurrentSeekPosition
});
