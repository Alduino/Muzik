import {readFile} from "fs/promises";
import {extname} from "path";
import {parseBuffer, selectCover} from "music-metadata";

const EXTENSION_MIME_MAP: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".avif": "image/avif"
};

export async function getImageBuffer(
    imageSourcePath: string,
    embedded: boolean
): Promise<{buffer: Buffer; mime: string}> {
    if (embedded) {
        const buffer = await readFile(imageSourcePath);
        const metadata = await parseBuffer(buffer, imageSourcePath);
        const cover = selectCover(metadata.common.picture);

        if (!cover) {
            throw new Error(
                "No cover found in embedded metadata for " + imageSourcePath
            );
        }

        return {
            buffer: cover.data,
            mime: cover.format
        };
    } else {
        const mime = EXTENSION_MIME_MAP[extname(imageSourcePath)];
        if (!mime) throw new Error("Unknown image extension");

        return {
            buffer: await readFile(imageSourcePath),
            mime
        };
    }
}
