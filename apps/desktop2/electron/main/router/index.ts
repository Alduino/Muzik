import {router} from "../trpc";
import {artwork} from "./artwork";
import {meta} from "./meta";
import {playback} from "./playback";
import {tracks} from "./tracks";

export const appRouter = router({
    artwork,
    meta,
    playback,
    tracks
});

export type AppRouter = typeof appRouter;
