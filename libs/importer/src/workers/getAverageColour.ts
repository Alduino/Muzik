import FastAverageColor, {IFastAverageColorOptions} from "fast-average-color";

interface Params {
    buffer: ArrayBuffer;
    options: IFastAverageColorOptions;
}

export default function getAverageColour({buffer, options}: Params) {
    const startTime = process.hrtime.bigint();

    const fac = new FastAverageColor();
    const typedArray = new Uint8Array(buffer);

    const result = fac.prepareResult(
        fac.getColorFromArray4(typedArray, options)
    );

    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    return [result, durationMs] as const;
}
