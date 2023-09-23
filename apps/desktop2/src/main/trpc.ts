import {initTRPC} from "@trpc/server";
import * as observable from "@trpc/server/observable";
import superjson from "superjson";

const t = initTRPC.create({
    transformer: superjson,
    errorFormatter({shape}) {
        return shape;
    }
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const middleware = t.middleware;
export const procedure = t.procedure;

export {observable};
