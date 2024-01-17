import {initTRPC} from "@trpc/server";
import * as observable from "@trpc/server/observable";
import superjson from "superjson";
import {childLogger} from "./router/_log.ts";

const log = childLogger("trpc");

const t = initTRPC.create({
    transformer: superjson,
    errorFormatter({shape}) {
        return shape;
    }
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const middleware = t.middleware;
export const procedure = t.procedure.use(async opts => {
    log.trace({path: opts.path, input: opts.input}, "API request");

    try {
        return await opts.next();
    } catch (err) {
        log.warn(err, "Error in TRPC response");
        throw err;
    }
});

export {observable};
