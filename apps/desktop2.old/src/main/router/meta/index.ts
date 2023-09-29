import {router} from "../../trpc.ts";
import {import_} from "./import.ts";
import {init} from "./init.ts";

export const meta = router({
    init,
    import: import_
});
