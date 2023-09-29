import {phash} from "@muzik/importer-native";
import {setupNative} from "../utils/setupNative";

setupNative();

export default function getImageFingerprint({
    arrayBuffer,
    mimeType
}: {
    arrayBuffer: ArrayBuffer;
    mimeType: string;
}) {
    const startTime = process.hrtime.bigint();
    const result = phash(new Uint8Array(arrayBuffer), mimeType);
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return [result, durationMs] as const;
}
