import log from "roarr";
// @ts-ignore Doesn't really need types anyway
import createSerializeErrorMiddleware from "@roarr/middleware-serialize-error";

export default function createLogger(name: string, isApp = false) {
    const context = isApp ? {application: name} : {package: name};

    return log.child(context).child(createSerializeErrorMiddleware());
}
