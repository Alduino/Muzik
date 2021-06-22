import {event} from "../../lib/rpc/get-first-artist-letters-by-album-ids/common";
import {NameResult, useRpc} from "./use-rpc";

export default function useFirstArtistLettersByAlbumIds(
    albumIds: number[] | null
): NameResult<typeof event> {
    return useRpc(albumIds ? event : null, {albumIds}, {refetchMultiplier: 10});
}
