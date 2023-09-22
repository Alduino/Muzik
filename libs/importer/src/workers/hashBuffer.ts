import {Xxh32} from "@node-rs/xxhash";

export default function hashBuffer(
    buffer: ArrayBuffer
): [hash: number, durationMs: number] {
    const startTime = process.hrtime.bigint();
    const hash = new Xxh32().update(Buffer.from(buffer)).digest();
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return [hash, durationMs];
}
