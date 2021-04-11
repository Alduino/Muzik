import {dirname, resolve} from "path";
import {readdir} from "fs/promises";
import {fromFile as mimeFromFile} from "file-type";
import {SongInfo} from "./getSongInfo";
import {log} from "./logger";

// TODO
const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface AlbumArt {
    path: string;
    mime: string;
}

export async function getAlbumArt(
    albumSongs: SongInfo[]
): Promise<AlbumArt | null> {
    const searchDirectories = new Set<string>();

    for (const song of albumSongs) {
        const dir = dirname(song.path);
        searchDirectories.add(dir);
    }

    for (const dir of searchDirectories) {
        log.trace("Searching %s for album art", dir);

        // we don't need to search recursively
        const files = await readdir(dir);

        for (const file of files) {
            const path = resolve(dir, file);
            const format = await mimeFromFile(path);

            if (!format) continue;
            if (!SUPPORTED_MIME_TYPES.includes(format.mime)) continue;

            log.trace("File is valid album art: %s", format.mime);
            return {path, mime: format.mime};
        }
    }

    return null;
}
