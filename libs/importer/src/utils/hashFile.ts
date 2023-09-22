import {readFile} from "fs/promises";
import {Xxh32} from "@node-rs/xxhash";

export async function hashFile(path: string) {
    const buffer = await readFile(path);
    const hasher = new Xxh32();
    hasher.update(buffer);
    return hasher.digest();
}
