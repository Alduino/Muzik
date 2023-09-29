import {getBufferHash} from "@muzik/importer-native";
import {setupNative} from "../utils/setupNative";

setupNative();

export default function hashBuffer(
    buffer: ArrayBuffer
): [hash: number, durationMs: number] {
    const startTime = process.hrtime.bigint();
    const hash = getBufferHash(new Uint8Array(buffer));
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return [hash, durationMs];
}
