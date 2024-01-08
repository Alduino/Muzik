import {DB} from "@muzik/db";
import {Kysely} from "kysely";
import {Progress} from "./Progress";

export interface Context {
    db: Kysely<DB>;
    progress: Progress;
}

let context: Context | undefined;

export function setContext(newContext: Context) {
    context = newContext;
}

export function getContext(): Context {
    if (!context) {
        throw new Error("Context not set");
    }

    return context;
}
