import {router} from "../trpc";
import {artwork} from "./artwork";
import {meta} from "./meta";
import {tracks} from "./tracks";

export const appRouter = router({
    artwork,
    meta,
    tracks
});

export type AppRouter = typeof appRouter;
