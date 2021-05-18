import {ErrorCode, isCode} from "../lib/error-constants";
import {EVENT_DATABASE_INIT, EVENT_MUSIC_IMPORT} from "../lib/ipc-constants";
import {invoke} from "../lib/ipc/renderer";
import {
    setCurrentDescription,
    setCurrentProgress,
    setLoadComplete
} from "./reducers/loadState";
import {GlobalRoute, setGlobalRoute} from "./reducers/routing";
import store from "./store";

const muzikInitialised = false;

export default async function initialiseMuzik(): Promise<void> {
    if (muzikInitialised) {
        console.debug("Muzik is already initialised");
        return;
    }

    console.info("Initialising...");

    console.debug("Setting up the database");
    store.dispatch(setCurrentDescription("Setting up the database"));
    try {
        await invoke(EVENT_DATABASE_INIT);
    } catch (err) {
        if (isCode(err, ErrorCode.databaseAlreadyInitialised)) {
            console.warn("Database has already been initialised");
        } else throw err;
    }

    console.debug("Importing song library");
    store.dispatch(setCurrentDescription("Importing your songs"));

    try {
        await invoke(
            EVENT_MUSIC_IMPORT,
            {
                progressFrequency: 10
            },
            progress => {
                store.dispatch(setCurrentProgress(progress));
            }
        );
    } catch (err) {
        if (isCode(err, ErrorCode.musicStoreNotPicked)) {
            console.debug(
                "Music store has not been chosen, navigating to picker."
            );
            store.dispatch(setGlobalRoute(GlobalRoute.musicStorePicker));
        } else throw err;
    }

    await console.debug("Done");
    store.dispatch(setLoadComplete());
}
