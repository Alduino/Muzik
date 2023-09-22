import {existsSync} from "fs";
import {readFile, stat} from "fs/promises";
import {LineType, LyricLine as ParsedLyricLine, parse as parseLrc} from "clrc";
import {IAudioMetadata} from "music-metadata";
import {log} from "../logger";
import {getContext} from "./context";

export interface StaticLyrics {
    lines: string[];
}

export interface TimedLyricLine {
    startSeconds: number;
    content: string;
}

export async function discoverLyrics(
    sourcePath: string,
    metadata: IAudioMetadata
): Promise<number | null> {
    if (metadata.common.lyrics) {
        log.warn(
            "Found embedded lyrics in %s, currently this is not supported",
            sourcePath
        );
    }

    const lyricsPath = sourcePath.replace(/\.[^.]+$/, ".lrc");

    if (!existsSync(lyricsPath)) return null;

    const stats = await stat(lyricsPath);

    if (!stats.isFile()) {
        log.warn("Found lyrics at %s, but it is not a file", lyricsPath);
        return null;
    }

    const source = await readFile(lyricsPath, "utf8");

    const lyrics = parseLrc(source);

    const {db} = getContext();

    if (lyrics.every(line => line.type === LineType.INVALID)) {
        // Probably a static lyrics file

        log.trace(
            "Discovered static lyrics for %s at %s (%s lines)",
            sourcePath,
            lyricsPath,
            lyrics.length
        );

        const {id} = await db.lyrics.upsert({
            where: {
                path: sourcePath
            },
            create: {
                path: sourcePath,
                staticLyrics: source
            },
            update: {
                staticLyrics: source
            },
            select: {
                id: true
            }
        });

        return id;
    }

    const lyricLines = lyrics.filter(
        line => line.type === LineType.LYRIC
    ) as ParsedLyricLine[];

    log.trace(
        "Discovered timed lyrics for %s at %s (%s lines, %s invalid)",
        sourcePath,
        lyricsPath,
        lyricLines.length,
        lyrics.filter(line => line.type === LineType.INVALID).length
    );

    const timedLyricsJson = JSON.stringify(
        lyricLines.map(line => ({
            startTimeSeconds: line.startMillisecond / 1000,
            text: line.content
        }))
    );

    const {id} = await db.lyrics.upsert({
        where: {
            path: sourcePath
        },
        create: {
            path: sourcePath,
            timedLines: timedLyricsJson
        },
        update: {
            timedLines: timedLyricsJson
        }
    });

    return id;
}
