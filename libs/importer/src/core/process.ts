import {parseFile as readMetadata} from "music-metadata";
import {log} from "../logger";
import {discoverArtwork} from "../utils/artwork";
import {getContext} from "../utils/context";
import {discoverLyrics} from "../utils/lyrics";

async function tryReadMetadata(path: string) {
    try {
        return await readMetadata(path);
    } catch {
        return null;
    }
}

const CONTAINER_MIME_MAP: Record<string, string> = {
    AIFF: "audio/aiff", // .aif
    "AIFF-C": "audio/aiff", // .aifc
    DSF: "audio/x-dsf", // .dsf
    "Musepack, SV7": "audio/musepack", // .mpc
    "Musepack, SV8": "audio/musepack", // .mpc
    Ogg: "audio/ogg", // .ogg
    WAVE: "audio/wave", // .wav
    WavPack: "audio/wavpack", // .wv
    "DSDIFF/DSD": "audio/dsd", // .dff
    "Monkey's Audio": "audio/ape", // .ape
    FLAC: "audio/flac" // .flac
};

function getAudioMimeType(container: string, codec: string) {
    const mimeBase = CONTAINER_MIME_MAP[container];
    if (!mimeBase) return null;

    return `${mimeBase}; codecs="${codec.toLowerCase()}"`;
}

export async function processFile(path: string) {
    const metadata = await tryReadMetadata(path);

    if (!metadata) {
        log.trace(`Failed to read metadata for ${path} - not an audio file?`);
        return;
    }

    if (
        !metadata.format.container ||
        !metadata.format.codec ||
        !metadata.format.bitrate ||
        !metadata.format.numberOfChannels ||
        !metadata.format.sampleRate ||
        !metadata.format.bitsPerSample ||
        !metadata.format.duration
    ) {
        log.trace("Missing required information in metadata for %s", path);
        return;
    }

    const mimeType = getAudioMimeType(
        metadata.format.container,
        metadata.format.codec
    );

    if (!mimeType) {
        log.trace(
            "Unsupported audio container (%s) for %s",
            metadata.format.container,
            path
        );
        return;
    }

    const {db} = getContext();

    log.trace("Creating audio source in database for %s", path);

    log.trace(`Discovered ${metadata.format.container} file at ${path}`);

    const artwork = await discoverArtwork(path, metadata);

    const lyricsId = await discoverLyrics(path, metadata);

    log.trace("Updating sources in database");

    const embeddedImageSourceId = artwork.find(artwork => artwork.path === path)
        ?.id;

    await db.audioSource.upsert({
        where: {
            path
        },
        create: {
            path,
            mimeType,
            bitrate: metadata.format.bitrate,
            channels: metadata.format.numberOfChannels,
            sampleRate: metadata.format.sampleRate,
            bitsPerSample: metadata.format.bitsPerSample,
            duration: metadata.format.duration,
            embeddedImageSourceId,
            lyricsId
        },
        update: {
            mimeType,
            bitrate: metadata.format.bitrate,
            channels: metadata.format.numberOfChannels,
            sampleRate: metadata.format.sampleRate,
            bitsPerSample: metadata.format.bitsPerSample,
            duration: metadata.format.duration,
            embeddedImageSourceId,
            lyricsId
        },
        select: {
            id: true
        }
    });
}
