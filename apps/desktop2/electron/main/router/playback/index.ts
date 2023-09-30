import {router} from "../../trpc.ts";
import {getCurrentTrack, setCurrentTrack} from "./current-track.ts";
import {play} from "./playback-state.ts";
import {getCurrentSeekPosition} from "./seeking.ts";

export const playback = router({
    getCurrentTrack,
    setCurrentTrack,
    play,
    getCurrentSeekPosition
});
