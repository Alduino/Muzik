import createDiscordRpClient from "discord-rich-presence";
import {Response as RichPresenceConfiguration} from "../lib/rpc/get-discord-rich-presence-configuration/common";
import {Request} from "../lib/rpc/set-play-state/common";
import {store} from "./configuration";
import {getNamesByTrackId} from "./database";

const rpClient = createDiscordRpClient("857531285495742464");

let lastRequest: Request;
export default async function updateRichPresence(
    req: Request = lastRequest
): Promise<void> {
    if (!req) return;

    const config = store.get(
        "integrations.discordRichPresence"
    ) as RichPresenceConfiguration;

    if (!config.isEnabled) {
        rpClient.updatePresence({});
        return;
    }

    lastRequest = req;

    if (req.trackId === false) {
        rpClient.updatePresence({});
        return;
    }

    const names = getNamesByTrackId(req.trackId);

    rpClient.updatePresence({
        details: `${names.track} by ${names.artist}`,
        state: req.state,
        startTimestamp: req.startedAt,
        largeImageKey: "icon"
    });
}
