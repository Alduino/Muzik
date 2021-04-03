import log, {Logger} from "roarr";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Doesn't really need types anyway
import createSerializeErrorMiddleware from "@roarr/middleware-serialize-error";

export function createLogger(name: string, isApp = false): Logger {
    // logger already adds the @, we don't want to duplicate it
    name = name.replace(/^@/, "");

    const context = isApp ? {application: name} : {package: name};

    return log.child(context).child(createSerializeErrorMiddleware());
}
