import {readdir, stat} from "fs/promises";
import {resolve} from "path";
import {existsSync} from "fs";
import {fromFile as mimeFromFile} from "file-type";
import {log} from "./logger";

// TODO move to module
const SUPPORTED_MIME_TYPES = ["audio/x-flac"];

export async function getSongFiles(dir: string): Promise<string[]> {
    const files = await readdir(dir);

    return Promise.all(
        files.map(async file => {
            const path = resolve(dir, file);

            // ignore dot files
            if (file.startsWith(".")) return false;

            // ignore files that don't exist (how that happens? idk lol
            if (!existsSync(path)) return false;

            try {
                const stats = await stat(path);
                if (stats.isDirectory()) return await getSongFiles(path);
                const type = await mimeFromFile(path);
                if (type && SUPPORTED_MIME_TYPES.includes(type.mime)) {
                    log.trace("Found a valid file, %s", path);
                    return path;
                }
            } catch (err) {
                log.warn(
                    err,
                    "Got an error when searching, will ignore %s",
                    file
                );
            }

            return false;
        })
    ).then(res => res.filter(v => v).flat() as string[]);
}
