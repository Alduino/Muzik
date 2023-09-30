import {useState} from "react";
import {trpc} from "../../utils/trpc.ts";

export function useCurrentTrack() {
    const [currentTrack, setCurrentTrack] = useState<number | null>(null);

    trpc.playback.getCurrentTrack.useSubscription(undefined, {
        onData: setCurrentTrack
    });

    return currentTrack;
}
