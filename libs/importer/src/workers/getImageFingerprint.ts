import {phash} from "../utils/phash";

export default async function getImageFingerprint(arrayBuffer: ArrayBuffer) {
    const startTime = process.hrtime.bigint();
    const result = await phash(arrayBuffer);
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return [result.toString(16), durationMs] as const;
}
