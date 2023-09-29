import {router} from "../../trpc.ts";
import {config} from "./config";
import {showOpenDialog} from "./file-dialog.ts";
import {getImportProgress, import_} from "./import.ts";
import {init} from "./init.ts";

export const meta = router({
    config,
    showOpenDialog,
    init,
    import: import_,
    getImportProgress
});
