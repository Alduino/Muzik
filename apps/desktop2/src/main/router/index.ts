import {procedure, router} from "../trpc";

export const appRouter = router({
    healthcheck: procedure.query(() => "OK")
});

export type AppRouter = typeof router;
