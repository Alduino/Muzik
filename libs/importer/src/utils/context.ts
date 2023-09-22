import {PrismaClient} from "@muzik/db";
import {Progress} from "./Progress";

export interface Context {
    db: PrismaClient;
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
