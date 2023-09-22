import {existsSync} from "fs";
import {readFile, stat} from "fs/promises";
import {LineType, LyricLine, parse} from "clrc";
import {IAudioMetadata} from "music-metadata";

export interface DiscoverLyricsResult {
    path: string;
    staticLyrics: string | null;
    timedLyrics: string | null;
}

export async function discoverLyrics(
    sourcePath: string
): Promise<DiscoverLyricsResult | null> {
    const lyricsPath = sourcePath.replace(/\.[^.]+$/, ".lrc");
    if (!existsSync(lyricsPath)) return null;

    const stats = await stat(lyricsPath);
    if (!stats.isFile()) return null;

    const source = await readFile(lyricsPath, "utf8");
    const lyrics = parse(source);

    const isStatic = lyrics.every(line => line.type === "invalid");

    if (isStatic) {
        return {
            path: lyricsPath,
            staticLyrics: source,
            timedLyrics: null
        };
    } else {
        const lyricLines = lyrics.filter(
            line => line.type === LineType.LYRIC
        ) as LyricLine[];

        return {
            path: lyricsPath,
            staticLyrics: null,
            timedLyrics: JSON.stringify(
                lyricLines.map(line => ({
                    startTimeSeconds: line.startMillisecond / 1000,
                    text: line.content
                }))
            )
        };
    }
}
