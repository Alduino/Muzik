import {router} from "../trpc";
import {meta} from "./meta";
import {tracks} from "./tracks";

export const appRouter = router({
    meta,
    tracks
});

export type AppRouter = typeof appRouter;
