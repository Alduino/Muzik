import {readFile} from "fs/promises";
import {parseBuffer, selectCover} from "music-metadata";

export async function getImageBuffer(
    imageSourcePath: string,
    embedded: boolean
): Promise<Buffer> {
    if (embedded) {
        const buffer = await readFile(imageSourcePath);
        const metadata = await parseBuffer(buffer, imageSourcePath);
        const cover = selectCover(metadata.common.picture);

        if (!cover) {
            throw new Error(
                "No cover found in embedded metadata for " + imageSourcePath
            );
        }

        return cover.data;
    } else {
        return await readFile(imageSourcePath);
    }
}
