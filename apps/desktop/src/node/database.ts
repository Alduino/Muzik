import {resolve, dirname} from "path";
import {Database} from "@muzik/database";
import scan from "@muzik/song-scanner";
import {store} from "./configuration";
import {ErrorCode, throwError} from "../lib/error-constants";

let db: Database | null = null;

export async function initialise(): Promise<void> {
    if (db) throwError(ErrorCode.databaseAlreadyInitialised);
    const path = resolve(dirname(store.path), "database");
    db = await Database.create(path);
    await db.initialise();
}

export function importMusic(
    progress: (percent: number) => void,
    path: string = store.get("musicStore")
): Promise<void> {
    if (!db) throwError(ErrorCode.databaseNotInitialised);
    if (path === null) throwError(ErrorCode.musicStoreNotPicked);
    return scan(db, path, progress);
}
