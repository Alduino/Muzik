import {ReactElement} from "react";
import {trpc} from "../../utils/trpc.ts";

export function Component(): ReactElement {
    //const songs = trpc.tracks.list.useInfiniteQuery({});

    const mutator = trpc.meta.import.useMutation();

    return (
        <button
            onClick={() => {
                mutator.mutate();
            }}
        >
            Start Importing
        </button>
    );
}
