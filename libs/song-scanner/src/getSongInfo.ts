import {parseFile as readId3} from "music-metadata";
import {log} from "./logger";

export interface SongInfo {
    path: string;
    artist: string;
    album: string;
    name: string;
    trackNo: number;
}

export function getSongInfo(files: string[]): Promise<SongInfo[]> {
    return Promise.all(
        files.map(
            async (path): Promise<SongInfo> => {
                const tags = await readId3(path);
                log.trace("Got song info for %s", path);

                return {
                    path,
                    artist: tags.common.artist || "No artist",
                    album: tags.common.album || "No album",
                    name: tags.common.title || "No title",
                    trackNo: tags.common.track.no || -1
                };
            }
        )
    );
}
