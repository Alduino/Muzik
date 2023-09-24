import {router} from "../../trpc.ts";
import {list} from "./list.ts";

export const tracks = router({
    list
});
