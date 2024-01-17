import {existsSync} from "fs";
import {mkdir, readFile, writeFile} from "fs/promises";
import {dirname, join} from "path";
import {app} from "electron";
import {parseBuffer, selectCover} from "music-metadata";
import {childLogger} from "../../../shared/logger.ts";

const log = childLogger("image-loading");

function getBaseImageCachePath() {
    return join(app.getPath("userData"), "cache", "images");
}

function getEmbeddedImageCachePath(imageSourceId: number) {
    return join(getBaseImageCachePath(), "embedded", imageSourceId.toString());
}

function getResizeImageCachePath(
    imageSourceId: number,
    resizeMinDimension: number
) {
    return join(
        getBaseImageCachePath(),
        "resized",
        resizeMinDimension.toString(),
        imageSourceId.toString()
    );
}

function getImageSourceKey(imageSourceId: number) {
    return `image-source:${imageSourceId}`;
}

function getResizeKey(imageSourceId: number, resizeMinDimension: number) {
    return `image-source:${imageSourceId}:resize:${resizeMinDimension}`;
}

const currentlyLoadingPaths = new Map<string, Promise<string>>();

function wrapWithCurrentlyLoadingCheck(key: string, fn: () => Promise<string>) {
    const existing = currentlyLoadingPaths.get(key);

    if (existing) {
        return existing;
    }

    const promise = fn();

    currentlyLoadingPaths.set(key, promise);

    promise.then(() => {
        currentlyLoadingPaths.delete(key);
    });

    return promise;
}

async function getImagePathImpl(
    imageSourceId: number,
    imageSourcePath: string,
    embedded: boolean
): Promise<string> {
    if (embedded) {
        const cachePath = getEmbeddedImageCachePath(imageSourceId);

        if (existsSync(cachePath)) {
            log.trace({cachePath}, "Using cached embedded image");
            return cachePath;
        }

        const buffer = await readFile(imageSourcePath);
        const metadata = await parseBuffer(buffer, imageSourcePath);
        const cover = selectCover(metadata.common.picture);

        if (!cover) {
            throw new Error(
                "No cover found in embedded metadata for " + imageSourcePath
            );
        }

        log.trace({cachePath}, "Saving embedded image to cache");

        await mkdir(dirname(cachePath), {recursive: true});
        await writeFile(cachePath, cover.data);

        return cachePath;
    } else {
        return imageSourcePath;
    }
}

async function getResizedImagePathImpl(
    imageSourceId: number,
    imageSourcePath: string,
    resizeMinDimension: number,
    embedded: boolean
) {
    const cachePath = getResizeImageCachePath(
        imageSourceId,
        resizeMinDimension
    );

    if (existsSync(cachePath)) {
        log.trace({cachePath}, "Using cached resized image");
        return cachePath;
    }

    const sourceImagePath = await getImagePath(
        imageSourceId,
        imageSourcePath,
        embedded
    );

    const imageBuff = await readFile(sourceImagePath);

    const {default: sharp} = await import("sharp");
    const image = await sharp(imageBuff);

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error("Invalid image");
    }

    const resized =
        metadata.width < metadata.height
            ? image.resize({
                  width: resizeMinDimension
              })
            : image.resize({
                  height: resizeMinDimension
              });

    log.trace({cachePath}, "Saving resized image to cache");

    await mkdir(dirname(cachePath), {recursive: true});
    await resized.toFile(cachePath);

    return cachePath;
}

export function getImagePath(
    imageSourceId: number,
    imageSourcePath: string,
    embedded: boolean
) {
    return wrapWithCurrentlyLoadingCheck(getImageSourceKey(imageSourceId), () =>
        getImagePathImpl(imageSourceId, imageSourcePath, embedded)
    );
}

export function getResizedImagePath(
    imageSourceId: number,
    imageSourcePath: string,
    resizeMinDimension: number,
    embedded: boolean
) {
    return wrapWithCurrentlyLoadingCheck(
        getResizeKey(imageSourceId, resizeMinDimension),
        () =>
            getResizedImagePathImpl(
                imageSourceId,
                imageSourcePath,
                resizeMinDimension,
                embedded
            )
    );
}
