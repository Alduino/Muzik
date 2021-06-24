import createDiscordRpClient from "discord-rich-presence";
import {Request} from "../lib/rpc/set-play-state/common";
import {getNamesByTrackId, getSongById, getTracksByAlbumId} from "./database";

const rpClient = createDiscordRpClient("857531285495742464");

export default async function updateRichPresence(req: Request): Promise<void> {
    if (req.trackId === false) {
        rpClient.updatePresence({});
        return;
    }

    const track = await getSongById(req.trackId);
    const names = getNamesByTrackId(req.trackId);
    const allTracks = await getTracksByAlbumId(track.albumId);

    rpClient.updatePresence({
        details: `${names.artist} - ${names.track}`,
        state: req.state,
        startTimestamp: req.startedAt,
        largeImageKey: "icon",
        partySize: track.trackNo,
        partyMax:
            allTracks.length >= track.trackNo ? allTracks.length : undefined
    });
}
