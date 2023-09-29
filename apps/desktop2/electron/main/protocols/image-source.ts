import {createReadStream} from "fs";
import {readFile} from "fs/promises";
import {Readable} from "stream";
import {protocol} from "electron";
import {parseBuffer, selectCover} from "music-metadata";
import {prisma} from "../prisma.ts";

async function getImageStream(
    imageSourcePath: string,
    embedded: boolean
): Promise<Readable> {
    if (embedded) {
        const buffer = await readFile(imageSourcePath);
        const metadata = await parseBuffer(buffer, imageSourcePath);
        const cover = selectCover(metadata.common.picture);

        if (!cover) {
            throw new Error(
                "No cover found in embedded metadata for " + imageSourcePath
            );
        }

        return Readable.from(cover.data);
    } else {
        return createReadStream(imageSourcePath);
    }
}

export function registerImageSourceProtocol() {
    protocol.registerStreamProtocol(
        "image-source",
        async (request, callback) => {
            const id = request.url.substring("image-source://".length);

            const imageSource = await prisma.imageSource.findUniqueOrThrow({
                where: {
                    id: parseInt(id)
                },
                select: {
                    path: true,
                    format: true,
                    embeddedIn: {
                        select: {
                            id: true
                        }
                    }
                }
            });

            const stream = await getImageStream(
                imageSource.path,
                imageSource.embeddedIn != null
            );

            callback({
                data: stream,
                headers: {
                    "content-type": imageSource.format
                }
            });
        }
    );
}
