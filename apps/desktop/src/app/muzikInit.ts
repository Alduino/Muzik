import {ErrorCode, isCode} from "../lib/error-constants";
import {invoke} from "../lib/ipc/renderer";
import {EVENT_DATABASE_INIT, EVENT_MUSIC_IMPORT} from "../lib/ipc-constants";
import {setCurrentDescription, setLoadComplete} from "./reducers/loadState";
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

    console.debug("Done");
    store.dispatch(setLoadComplete());

    try {
        if (process.env.NODE_ENV === "production") {
            // Really slow with a big library! (TODO: fix)
            console.debug("Running importer in the background");
            await invoke(EVENT_MUSIC_IMPORT);
        }
    } catch (err) {
        if (isCode(err, ErrorCode.musicStoreNotPicked)) {
            console.debug(
                "Music store has not been chosen, navigating to picker."
            );
        } else throw err;
    }
}
