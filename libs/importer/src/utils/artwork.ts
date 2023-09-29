import {existsSync} from "fs";
import {readFile, stat} from "fs/promises";
import {dirname} from "path";
import {PrismaPromise} from "@muzik/db";
import {IAudioMetadata, IPicture, selectCover} from "music-metadata";
import type {FormatEnum, Sharp} from "sharp";
import {log} from "../logger";
import {getContext} from "./context";

interface ArtworkMetadata {
    mimeType: string;
    width: number;
    height: number;
}

interface EmbeddedArtwork extends ArtworkMetadata {
    kind: "embedded";
    data: Buffer;

    // Path to the audio file, so the artwork can be removed when the audio file is
    path: string;
}

interface ExternalArtwork extends ArtworkMetadata {
    kind: "external";
    path: string;
}

export type ArtworkSource = EmbeddedArtwork | ExternalArtwork;

const FORMAT_MIME_MAP: Record<keyof FormatEnum, string | null> = {
    avif: "image/avif",
    dz: "image/dz",
    fits: "image/fits",
    gif: "image/gif",
    heif: "image/heif",
    input: null,
    jp2: "image/jp2",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    jxl: "image/jxl",
    magick: null,
    openslide: null,
    pdf: null,
    png: "image/png",
    ppm: "image/x-portable-pixmap",
    raw: null,
    svg: "image/svg+xml",
    tif: "image/tiff",
    tiff: "image/tiff",
    v: null,
    webp: "image/webp"
};

async function getArtworkMetadata(data: Buffer, debugPath: string) {
    let image: Sharp;

    try {
        const {default: sharp} = await import("sharp");
        image = sharp(data);
    } catch (err) {
        log.warn(err, "Failed to read embedded artwork at %s", debugPath);
        return null;
    }

    const {width, height, format} = await image.metadata();

    if (!width || !height) {
        log.warn("Embedded artwork at %s has no dimensions", debugPath);
        return null;
    }

    if (!format) {
        log.warn("Embedded artwork at %s has no format", debugPath);
        return null;
    }

    const mimeType = FORMAT_MIME_MAP[format];

    if (!mimeType) {
        log.warn(
            "Embedded artwork at %s has unknown format %s",
            debugPath,
            format
        );
        return null;
    }

    return {
        width,
        height,
        mimeType
    };
}

async function readEmbeddedArtwork(
    artwork: IPicture,
    sourcePath: string
): Promise<EmbeddedArtwork | null> {
    const metadata = await getArtworkMetadata(artwork.data, sourcePath);
    if (!metadata) return null;

    return {
        kind: "embedded",
        data: artwork.data,
        path: sourcePath,
        ...metadata
    };
}

async function readExternalArtwork(
    path: string
): Promise<ExternalArtwork | null> {
    if (!existsSync(path)) return null;

    const fileStats = await stat(path);
    if (!fileStats.isFile()) return null;

    const buffer = await readFile(path);
    const metadata = await getArtworkMetadata(buffer, path);
    if (!metadata) return null;

    return {
        kind: "external",
        path,
        ...metadata
    };
}

const externalArtworkExtensions = ["jpg", "jpeg", "png", "webp"];

const externalArtworkFileNames = [
    "cover",
    "folder",
    "thumb",
    "album",
    "albumartsmall"
];

export async function discoverArtwork(
    sourcePath: string,
    metadata: IAudioMetadata
) {
    const selectedCoverImage = selectCover(metadata.common.picture);

    const directory = dirname(sourcePath);

    const externalArtworkPaths = externalArtworkFileNames.flatMap(name => {
        return externalArtworkExtensions.map(ext => {
            return `${directory}/${name}.${ext}`;
        });
    });

    const imageSources = await Promise.all([
        selectedCoverImage &&
            readEmbeddedArtwork(selectedCoverImage, sourcePath),
        ...externalArtworkPaths.map(path => readExternalArtwork(path))
    ]).then(res => res.filter(Boolean) as ArtworkSource[]);

    log.trace(
        "Discovered %s cover image(s) for %s",
        imageSources.length,
        sourcePath
    );

    const {db} = getContext();

    const upserts: PrismaPromise<{id: number; path: string}>[] = [];

    for (const imageSource of imageSources) {
        if (imageSource.kind === "embedded") {
            upserts.push(
                db.imageSource.upsert({
                    where: {
                        path: sourcePath
                    },
                    create: {
                        path: sourcePath,
                        format: imageSource.mimeType,
                        width: imageSource.width,
                        height: imageSource.height
                    },
                    update: {
                        format: imageSource.mimeType,
                        width: imageSource.width,
                        height: imageSource.height
                    },
                    select: {
                        id: true,
                        path: true
                    }
                })
            );
        } else {
            upserts.push(
                db.imageSource.upsert({
                    where: {
                        path: imageSource.path
                    },
                    create: {
                        path: imageSource.path,
                        format: imageSource.mimeType,
                        width: imageSource.width,
                        height: imageSource.height
                    },
                    update: {
                        format: imageSource.mimeType,
                        width: imageSource.width,
                        height: imageSource.height
                    },
                    select: {
                        id: true,
                        path: true
                    }
                })
            );
        }
    }

    return db.$transaction(upserts);
}
