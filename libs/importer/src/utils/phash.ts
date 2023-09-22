import phashBase from "sharp-phash";

export async function phash(sourceBuffer: Buffer | ArrayBuffer) {
    const hashBinaryNumber = await phashBase(sourceBuffer);
    return BigInt(`0b${hashBinaryNumber}`);
}
