import {parseFile as readId3} from "music-metadata";
import {downloadBinaries, locateBinariesSync} from "ffbinaries";
import execa from "execa";
import promiseLimit from "promise-limit";
import {log} from "./logger";

export interface SongInfo {
    path: string;
    artist: string;
    album: string;
    name: string;
    trackNo: number;
    duration: number;
}

// based on npm:get-audio-duration library, but its ffprobe resolution doesn't
// work with pnpm workspaces and webpack :(
async function getAudioDuration(filePath: string, ffprobePath: string) {
    const params = [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_format",
        "-show_streams",
        filePath
    ];

    const {stdout: ffprobeResult} = await execa(ffprobePath, params);
    const match = ffprobeResult.match(/duration="?(\d*\.\d*)"?/);
    if (match && match[1]) return parseFloat(match[1]);
    throw new Error("No duration found!");
}

export async function getSongInfo(
    files: string[],
    progress: (prog: number) => void
): Promise<SongInfo[]> {
    log.debug("Downloading ffprobe...");
    await new Promise<void>(yay => {
        downloadBinaries(
            "ffprobe",
            {
                destination: "./.ffmpeg"
            },
            yay
        );
    });
    log.debug("Done");

    const ffLocs = locateBinariesSync("ffprobe", {
        paths: "./.ffmpeg"
    });

    const limit = promiseLimit<SongInfo>(6);

    let completedFiles = 0;
    return Promise.all(
        files.map(path =>
            limit(
                async (): Promise<SongInfo> => {
                    const tags = await readId3(path);
                    const duration = await getAudioDuration(
                        path,
                        ffLocs["ffprobe"].path
                    );
                    log.trace("Got song info for %s", path);

                    progress(++completedFiles / files.length);

                    return {
                        path,
                        artist: tags.common.artist || "No artist",
                        album: tags.common.album || "No album",
                        name: tags.common.title || "No title",
                        trackNo: tags.common.track.no || -1,
                        duration
                    };
                }
            )
        )
    );
}
