import execa from "execa";
import {downloadBinaries, locateBinariesSync} from "ffbinaries";
import {log} from "./logger";

export interface ExtraSongInfo {
    duration: number;
}

export interface SongInfoSetupResult {
    ffprobeLoc: string;
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

export async function setupExtraSongInfo(): Promise<SongInfoSetupResult> {
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

    return {
        ffprobeLoc: ffLocs.ffprobe.path
    };
}

export async function getExtraSongInfo(
    init: SongInfoSetupResult,
    path: string
): Promise<ExtraSongInfo> {
    return {
        duration: await getAudioDuration(path, init.ffprobeLoc)
    };
}
