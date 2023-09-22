declare module "sharp-phash" {
    export default function phash(
        buffer: Buffer | ArrayBuffer
    ): Promise<string>;
}
