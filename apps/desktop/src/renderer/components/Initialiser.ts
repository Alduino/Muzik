import {FC, useMemo} from "react";
import {log} from "../../logger";
import store from "../store";
import {setCurrentDescription, setLoadComplete} from "../reducers/loadState";
import {invoke} from "../../lib/ipc/renderer";
import {initialiseDatabaseEvent} from "../../ipc-constants";

type InitStage = [string, () => Promise<void> | void];

async function useInitialise() {
    useMemo(() => {
        log.info("Initialising...");

        const stages: InitStage[] = [
            ["Setting up the database", () => invoke(initialiseDatabaseEvent)]
        ];

        for (const [name, callback] of stages) {
            log.debug("Init: %s", name);
            store.dispatch(setCurrentDescription(name));
        }

        store.dispatch(setLoadComplete());
    }, []);
}

export const Initialiser: FC = () => {
    useInitialise();

    return null;
};
