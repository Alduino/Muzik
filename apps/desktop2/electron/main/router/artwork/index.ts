import {router} from "../../trpc.ts";
import {imageSource} from "./imageSource.ts";

export const artwork = router({
    imageSource
});
