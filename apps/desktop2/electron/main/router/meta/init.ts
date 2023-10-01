import {log} from "../../../../shared/logger.ts";
import {observable, procedure} from "../../trpc.ts";

let initialisationComplete = false;

const initCompletionHandlers = new Set<() => void>();

export function markInitialisationComplete() {
    log.info("Initialisation complete, notifying renderer");
    initialisationComplete = true;
    initCompletionHandlers.forEach(handler => handler());
    initCompletionHandlers.clear();
}

export const init = procedure.subscription(() => {
    return observable.observable<true>(observer => {
        if (initialisationComplete) {
            observer.next(true);
            observer.complete();
        } else {
            initCompletionHandlers.add(() => {
                observer.next(true);
                observer.complete();
            });
        }
    });
});
