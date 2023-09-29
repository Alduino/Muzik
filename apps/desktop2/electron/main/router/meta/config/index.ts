import {router} from "../../../trpc.ts";
import {getStoreDirectories, setStoreDirectories} from "./storeDirectories.ts";

export const config = router({
    getStoreDirectories,
    setStoreDirectories
});
