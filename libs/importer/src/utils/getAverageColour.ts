import {
    IFastAverageColorOptions,
    IFastAverageColorResult
} from "fast-average-color";
import Piscina from "piscina";
import sharp from "sharp";
import getAverageColourImpl from "../workers/getAverageColour";

export async function prepareAverageColourData(
    imageBuffer: Buffer,
    options: IFastAverageColorOptions
): Promise<ArrayBuffer> {
    let pipe = sharp(imageBuffer);
    const metadata = await pipe.metadata();

    if (metadata.width && metadata.height) {
        const size = prepareSizeAndPosition(
            {
                width: metadata.width,
                height: metadata.height
            },
            options
        );

        pipe = pipe
            .extract({
                left: options.left ?? 0,
                top: options.top ?? 0,
                width: size.srcWidth,
                height: size.srcHeight
            })
            .resize(size.destWidth, size.destHeight);
    }

    const buffer = await pipe.ensureAlpha().raw().toBuffer();
    return buffer.buffer;
}

// Will run locally if the worker is not defined
export async function getAverageColour(
    preparedData: ArrayBuffer,
    worker: Piscina | null,
    options: IFastAverageColorOptions
) {
    if (worker) {
        const [result, durationMs] = await worker.run(
            {buffer: preparedData, options},
            {
                transferList: [preparedData]
            }
        );

        return [
            result as IFastAverageColorResult,
            durationMs as number
        ] as const;
    } else {
        return getAverageColourImpl({buffer: preparedData, options});
    }
}

const MIN_SIZE = 10;
const MAX_SIZE = 100;

// extracted from `fast-average-color-node`:
function prepareSizeAndPosition(
    originalSize: {width: number; height: number},
    options: IFastAverageColorOptions
) {
    const srcLeft = options.left ?? 0;
    const srcTop = options.top ?? 0;
    const srcWidth = options.width ?? originalSize.width;
    const srcHeight = options.height ?? originalSize.height;

    let destWidth = srcWidth;
    let destHeight = srcHeight;

    if (options.mode === "precision") {
        return {
            srcLeft,
            srcTop,
            srcWidth,
            srcHeight,
            destWidth,
            destHeight
        };
    }

    let factor;

    if (srcWidth > srcHeight) {
        factor = srcWidth / srcHeight;
        destWidth = MAX_SIZE;
        destHeight = Math.round(destWidth / factor);
    } else {
        factor = srcHeight / srcWidth;
        destHeight = MAX_SIZE;
        destWidth = Math.round(destHeight / factor);
    }

    if (
        destWidth > srcWidth ||
        destHeight > srcHeight ||
        destWidth < MIN_SIZE ||
        destHeight < MIN_SIZE
    ) {
        destWidth = srcWidth;
        destHeight = srcHeight;
    }

    return {
        srcLeft,
        srcTop,
        srcWidth,
        srcHeight,
        destWidth,
        destHeight
    };
}
