import {event} from "../../lib/rpc/get-first-artist-letters-by-track-ids/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useFirstArtistLettersByTrackIds(
    trackIds: number[] | null
): NameResult<typeof event> {
    return useRpc(trackIds ? event : null, {trackIds}, {refetchMultiplier: 10});
}
