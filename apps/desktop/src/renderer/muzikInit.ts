import store from "./store";
import {setCurrentDescription, setLoadComplete} from "./reducers/loadState";
import {invoke} from "../lib/ipc/renderer";
import {EVENT_DATABASE_INIT} from "../ipc-constants";

const muzikInitialised = false;

export default async function initialiseMuzik(): Promise<void> {
    if (muzikInitialised) {
        console.debug("Muzik is already initialised");
        return;
    }

    console.info("Initialising...");

    console.debug("Setting up the database");
    store.dispatch(setCurrentDescription("Setting up the database"));
    await invoke(EVENT_DATABASE_INIT);

    console.debug("Done");
    store.dispatch(setLoadComplete());
}
