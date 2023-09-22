import {existsSync} from "fs";
import {readFile, stat} from "fs/promises";
import {dirname} from "path";
import {IAudioMetadata, IPicture, selectCover} from "music-metadata";
import sharp, {FormatEnum, Sharp} from "sharp";
import {log} from "../logger";

const IMAGE_MIME_MAP: Record<keyof FormatEnum, string | null> = {
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

const externalArtworkExtensions = ["jpg", "jpeg", "png", "webp"];

const externalArtworkFileNames = [
    "cover",
    "folder",
    "thumb",
    "album",
    "albumartsmall"
];

export interface ArtworkMetadata {
    path: string;
    format: string;
    width: number;
    height: number;
}

export interface DiscoverArtworkResult {
    embedded: ArtworkMetadata | null;
    external: ArtworkMetadata[];
}

export async function discoverArtwork(
    sourcePath: string,
    metadata: IAudioMetadata
): Promise<DiscoverArtworkResult> {
    const embeddedCoverImage = selectCover(metadata.common.picture);
    const embeddedArtwork =
        embeddedCoverImage &&
        (await readEmbeddedArtwork(embeddedCoverImage, sourcePath));

    const externalArtworkPaths = externalArtworkFileNames.flatMap(name => {
        return externalArtworkExtensions.map(ext => {
            return `${dirname(sourcePath)}/${name}.${ext}`;
        });
    });

    const externalArtwork = await Promise.all(
        externalArtworkPaths.map(path => readExternalArtwork(path))
    ).then(res => res.filter(Boolean) as ArtworkMetadata[]);

    return {
        embedded: embeddedArtwork,
        external: externalArtwork
    };
}

async function readEmbeddedArtwork(
    artwork: IPicture,
    sourcePath: string
): Promise<ArtworkMetadata | null> {
    const metadata = await getArtworkMetadata(artwork.data, sourcePath);
    if (!metadata) return null;

    return {
        path: sourcePath,
        ...metadata
    };
}

async function readExternalArtwork(
    path: string
): Promise<ArtworkMetadata | null> {
    if (!existsSync(path)) return null;

    const fileStats = await stat(path);
    if (!fileStats.isFile()) return null;

    const buffer = await readFile(path);
    const metadata = await getArtworkMetadata(buffer, path);
    if (!metadata) return null;

    return {
        path,
        ...metadata
    };
}

async function getArtworkMetadata(data: Buffer, debugPath: string) {
    let image: Sharp;

    try {
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

    const mimeType = IMAGE_MIME_MAP[format];

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
        format: mimeType
    };
}
