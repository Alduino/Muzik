import {getImageAverageColour} from "@muzik/importer-native";
import {setupNative} from "../utils/setupNative";

setupNative();

interface Params {
    buffer: ArrayBuffer;
}

export default function getAverageColour({buffer}: Params) {
    const startTime = process.hrtime.bigint();

    const result = getImageAverageColour(new Uint8Array(buffer));

    const {red, green, blue} = result;
    result.free();

    const rgb = (red << 16) | (green << 8) | blue;
    const hex = "#" + rgb.toString(16).padStart(6, "0");

    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    return [{hex}, durationMs] as const;
}
