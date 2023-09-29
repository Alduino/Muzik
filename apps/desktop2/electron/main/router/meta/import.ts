import {importTracks, type Progress} from "@muzik/importer";
import {dbPath} from "../../prisma.ts";
import {observable, procedure} from "../../trpc.ts";
import {configDb} from "../../utils/config.ts";
import {log} from "../../utils/logger.ts";

export interface ImportProgress {
    musicDiscovered: number;
}

let importProgress: Progress | null = null;
const progressHandlers = new Set<(progress: Progress) => void>();
const completionHandlers = new Set<() => void>();

export const import_ = procedure.mutation(async () => {
    if (importProgress) {
        throw new Error("Import already in progress");
    }

    log.info({directories: configDb.data.sourceDirectories}, "Starting import");

    const {promise, progress} = importTracks({
        dbPath,
        directories: configDb.data.sourceDirectories
    });

    importProgress = progress;

    progressHandlers.forEach(handler => handler(progress));

    await promise;

    importProgress = null;

    completionHandlers.forEach(handler => handler());
});

export const getImportProgress = procedure.subscription(() => {
    return observable.observable<ImportProgress | null>(observer => {
        const cleanupHandlers: (() => void)[] = [];

        function handleProgress(progress: Progress) {
            observer.next({
                musicDiscovered: progress.musicDiscovered
            });
        }

        if (importProgress) {
            importProgress.addListener(
                handleProgress.bind(null, importProgress)
            );
        } else {
            const handleImportStart = (progress: Progress) => {
                progress.addListener(handleProgress.bind(null, progress));
            };

            progressHandlers.add(handleImportStart);
            cleanupHandlers.push(() =>
                progressHandlers.delete(handleImportStart)
            );
        }

        function handleComplete() {
            observer.next(null);
        }

        completionHandlers.add(handleComplete);
        cleanupHandlers.push(() => completionHandlers.delete(handleComplete));

        return () => {
            cleanupHandlers.forEach(handler => handler());
        };
    });
});
