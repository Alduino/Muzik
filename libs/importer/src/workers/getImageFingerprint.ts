import * as native from "@muzik/importer-native";

export default function getImageFingerprint({
    arrayBuffer,
    mimeType
}: {
    arrayBuffer: ArrayBuffer;
    mimeType: string;
}) {
    const startTime = process.hrtime.bigint();
    const result = native.phash(new Uint8Array(arrayBuffer), mimeType);
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return [result, durationMs] as const;
}
