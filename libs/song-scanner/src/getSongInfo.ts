import {parseFile as readId3} from "music-metadata";
import promiseLimit from "promise-limit";
import {log} from "./logger";

export interface SongInfo {
    path: string;
    artist: string;
    album: string;
    name: string;
    trackNo: number;
}

export async function getSongInfo(
    files: string[],
    progress: (prog: number) => void
): Promise<SongInfo[]> {
    const limit = promiseLimit<SongInfo>(6);

    let completedFiles = 0;
    return Promise.all(
        files.map(path =>
            limit(
                async (): Promise<SongInfo> => {
                    const tags = await readId3(path);
                    log.trace("Got song info for %s", path);

                    progress(++completedFiles / files.length);

                    return {
                        path,
                        artist: tags.common.artist || "No artist",
                        album: tags.common.album || "No album",
                        name: tags.common.title || "No title",
                        trackNo: tags.common.track.no || -1
                    };
                }
            )
        )
    );
}
