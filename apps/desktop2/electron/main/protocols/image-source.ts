import {createReadStream} from "fs";
import {protocol} from "electron";
import {prisma} from "../prisma.ts";
import {getImagePath, getResizedImagePath} from "../utils/image-loading.ts";

export function registerImageSourceProtocol() {
    protocol.registerStreamProtocol(
        "image-source",
        async (request, callback) => {
            const url = new URL(request.url);
            const id = parseInt(url.pathname.slice(1));
            const resizeMinDimension = url.searchParams.get("mind");

            if (Number.isNaN(id)) {
                throw new Error("Invalid id");
            }

            const imageSource = await prisma.imageSource.findUniqueOrThrow({
                where: {
                    id: id
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

            if (!resizeMinDimension) {
                const stream = createReadStream(
                    await getImagePath(
                        id,
                        imageSource.path,
                        imageSource.embeddedIn != null
                    )
                );

                callback({
                    data: stream,
                    headers: {
                        "content-type": imageSource.format
                    }
                });
            } else {
                const resizedImagePath = await getResizedImagePath(
                    id,
                    imageSource.path,
                    parseInt(resizeMinDimension),
                    imageSource.embeddedIn != null
                );

                const stream = createReadStream(resizedImagePath);

                callback({
                    data: stream,
                    headers: {
                        "content-type": imageSource.format
                    }
                });
            }
        }
    );
}
