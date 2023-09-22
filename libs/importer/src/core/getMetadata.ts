import {readFile} from "fs/promises";
import {PrismaPromise} from "@muzik/db";
import {IAudioMetadata, parseBuffer as readMetadata} from "music-metadata";
import Piscina from "piscina";
import {log} from "../logger";
import {PipelinedQueue} from "../utils/PipelinedQueue";
import {getContext} from "../utils/context";
import {discoverArtwork} from "./discoverArtwork";
import {discoverLyrics} from "./discoverLyrics";

async function tryReadMetadata(path: string, buffer: Buffer) {
    try {
        return await readMetadata(buffer, path);
    } catch {
        return null;
    }
}

const AUDIO_CONTAINER_MIME_MAP: Record<string, string> = {
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
    const mimeBase = AUDIO_CONTAINER_MIME_MAP[container];
    if (!mimeBase) return null;

    return `${mimeBase}; codecs="${codec.toLowerCase()}"`;
}

export interface AudioSourceMetadata {
    path: string;

    audioSource: {
        hash: number;

        mimeType: string;
        bitrate: number;
        sampleRate: number;
        bitsPerSample: number;
        duration: number;

        rawMetadata: IAudioMetadata;
    };

    lyrics: {
        path: string;
        staticLyrics: string | null;
        timedLyrics: string | null;
    } | null;

    embeddedImageSource: {
        format: string;
        width: number;
        height: number;
    } | null;

    externalImageSources: {
        path: string;
        format: string;
        width: number;
        height: number;
    }[];
}

interface ContextWithStats {
    buffer: Buffer;
    loadDurationMs: number;
}

interface ResultWithStats<T> {
    result: T;
    loadDurationMs: number;
    calcDurationMs: number;
}

type ParseQueue = PipelinedQueue<
    string,
    ContextWithStats,
    ResultWithStats<IAudioMetadata | null> & {buffer: Buffer}
>;

type HashQueue = PipelinedQueue<
    string | Buffer,
    ContextWithStats,
    ResultWithStats<number>
>;

export interface LoadMetadataContext {
    hashWorkerPool: Piscina;
}

export async function loadMetadata(
    paths: string[],
    {hashWorkerPool}: LoadMetadataContext
) {
    const parseQueue = new PipelinedQueue<
        string,
        ContextWithStats,
        ResultWithStats<IAudioMetadata | null> & {buffer: Buffer}
    >(
        {
            async prepare(path) {
                const startTime = process.hrtime.bigint();
                const buffer = await readFile(path);
                const endTime = process.hrtime.bigint();

                return {
                    buffer,
                    loadDurationMs: Number(endTime - startTime) / 1e6
                };
            },
            async process(path, context) {
                const startTime = process.hrtime.bigint();
                const metadata = await tryReadMetadata(path, context.buffer);
                const endTime = process.hrtime.bigint();

                return {
                    result: metadata,
                    buffer: context.buffer,
                    loadDurationMs: context.loadDurationMs,
                    calcDurationMs: Number(endTime - startTime) / 1e6
                };
            }
        },
        {
            // TODO: figure out a good concurrency limit
            processConcurrency: 64
        }
    );

    const hashQueue = new PipelinedQueue<
        string | Buffer,
        ContextWithStats,
        ResultWithStats<number>
    >(
        {
            async prepare(path) {
                if (typeof path === "string") {
                    const startTime = process.hrtime.bigint();
                    const buffer = await readFile(path);
                    const endTime = process.hrtime.bigint();

                    return {
                        buffer,
                        loadDurationMs: Number(endTime - startTime) / 1e6
                    };
                } else {
                    return {
                        buffer: path,
                        loadDurationMs: 0
                    };
                }
            },
            async process(_, context) {
                const [hash, durationMs] = await hashWorkerPool.run(
                    context.buffer.buffer,
                    {
                        transferList: [context.buffer.buffer]
                    }
                );

                return {
                    result: hash,
                    loadDurationMs: context.loadDurationMs,
                    calcDurationMs: durationMs
                };
            }
        },
        {
            processConcurrency: hashWorkerPool.maxThreads
        }
    );

    const metadatas = await Promise.all(
        paths.map(path => getMetadata(path, {parseQueue, hashQueue}))
    );

    return metadatas.filter(Boolean) as AudioSourceMetadata[];
}

interface GetMetadataContext {
    parseQueue: ParseQueue;
    hashQueue: HashQueue;
}

/**
 * If memory usage gets too high, we won't keep around the source buffer for hashing.
 * Keeping it around is faster, but the file is quite large and we don't want to run out of memory.
 */
function isMemoryUsageTooHigh() {
    const {memoryUsage} = process;
    const {heapUsed, heapTotal} = memoryUsage();

    // If we're using more than 75% of the heap, we'll consider it too high
    return heapUsed / heapTotal > 0.75;
}

/**
 * Gets the low-level information to be upserted into the database for a given audio source.
 */
async function getMetadata(
    path: string,
    {parseQueue, hashQueue}: GetMetadataContext
): Promise<AudioSourceMetadata | null> {
    const {progress} = getContext();

    const {
        result: metadata,
        buffer: sourceBuffer,
        calcDurationMs: metadataParseDurationMs,
        loadDurationMs: loadForMetadataDurationMs
    } = await parseQueue.run(path);

    const bufferForHash = isMemoryUsageTooHigh() ? path : sourceBuffer;

    if (!metadata) {
        log.trace({path}, `Failed to read metadata - not an audio file?`);
        return null;
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
        log.trace({path}, "Missing required information in metadata");
        return null;
    }

    const mimeType = getAudioMimeType(
        metadata.format.container,
        metadata.format.codec
    );

    if (!mimeType) {
        log.trace(
            {container: metadata.format.container, path},
            "Unsupported audio container"
        );
        return null;
    }

    const [
        {
            result: hash,
            calcDurationMs: hashDurationMs,
            loadDurationMs: loadForHashDurationMs
        },
        artwork,
        lyrics
    ] = await Promise.all([
        hashQueue.run(bufferForHash),
        discoverArtwork(path, metadata),
        discoverLyrics(path)
    ]);

    // delete images to save some ram
    for (const image of metadata.common.picture ?? []) {
        // @ts-expect-error: we don't use `data`
        delete image.data;
    }

    log.trace(
        {
            container: metadata.format.container,
            metadataParseDurationMs,
            hashDurationMs,
            loadForMetadataDurationMs,
            loadForHashDurationMs,
            path
        },
        "Discovered audio source file"
    );

    progress.incrementMusicDiscovered();

    return {
        path,
        audioSource: {
            hash,
            mimeType,
            bitrate: metadata.format.bitrate,
            sampleRate: metadata.format.sampleRate,
            bitsPerSample: metadata.format.bitsPerSample,
            duration: metadata.format.duration,
            rawMetadata: metadata
        },
        embeddedImageSource: artwork.embedded,
        externalImageSources: artwork.external,
        lyrics
    };
}

export interface AudioSourceMetadataWithId extends AudioSourceMetadata {
    id: number;
}

export async function insertAudioSourceMetadata(
    audioSourceMetadata: AudioSourceMetadata[]
) {
    const {db} = getContext();

    log.debug(
        "Inserting %s audio sources with associated data",
        audioSourceMetadata.length
    );

    await db.$transaction(
        audioSourceMetadata.map(metadata =>
            db.audioSource.upsert({
                where: {
                    path: metadata.path
                },
                create: {
                    path: metadata.path,
                    mimeType: metadata.audioSource.mimeType,
                    bitrate: metadata.audioSource.bitrate,
                    sampleRate: metadata.audioSource.sampleRate,
                    bitsPerSample: metadata.audioSource.bitsPerSample,
                    duration: metadata.audioSource.duration,
                    embeddedImageSource: metadata.embeddedImageSource
                        ? {
                              connectOrCreate: {
                                  where: {
                                      path: metadata.path
                                  },
                                  create: {
                                      path: metadata.path,
                                      ...metadata.embeddedImageSource
                                  }
                              }
                          }
                        : undefined,
                    lyrics: metadata.lyrics
                        ? {
                              connectOrCreate: {
                                  where: {
                                      path: metadata.lyrics.path
                                  },
                                  create: {
                                      path: metadata.lyrics.path,
                                      staticLyrics:
                                          metadata.lyrics.staticLyrics,
                                      timedLines: metadata.lyrics.timedLyrics
                                  }
                              }
                          }
                        : undefined
                },
                update: {
                    mimeType: metadata.audioSource.mimeType,
                    bitrate: metadata.audioSource.bitrate,
                    sampleRate: metadata.audioSource.sampleRate,
                    bitsPerSample: metadata.audioSource.bitsPerSample,
                    duration: metadata.audioSource.duration
                }
            })
        )
    );

    await db.$transaction(
        audioSourceMetadata
            .map(metadata => {
                if (!metadata.lyrics) return;

                return db.lyrics.update({
                    where: {
                        path: metadata.lyrics.path
                    },
                    data: {
                        staticLyrics: metadata.lyrics.staticLyrics,
                        timedLines: metadata.lyrics.timedLyrics
                    }
                });
            })
            .filter(Boolean) as PrismaPromise<unknown>[]
    );
}

export async function linkAudioSourceMetadataIds(
    audioSourceMetadata: AudioSourceMetadata[]
): Promise<AudioSourceMetadataWithId[]> {
    const {db} = getContext();

    const audioSourceIds = await db.audioSource.findMany({
        where: {
            path: {
                in: audioSourceMetadata.map(metadata => metadata.path)
            }
        },
        select: {
            id: true,
            path: true
        }
    });

    return audioSourceMetadata.map<AudioSourceMetadataWithId>(metadata => {
        const data = audioSourceIds.find(a => a.path === metadata.path);
        if (!data) throw new Error("Missing audio source ID");

        return {
            ...metadata,
            id: data.id
        };
    });
}
