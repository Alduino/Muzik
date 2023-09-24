import {ReactElement} from "react";
import {trpc} from "../../utils/trpc.ts";

export function Component(): ReactElement {
    const songs = trpc.tracks.list.useInfiniteQuery({});

    return null;
}
