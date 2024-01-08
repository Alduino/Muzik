import {createReadStream} from "fs";
import {protocol} from "electron";
import {db} from "../db.ts";
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

            const imageSource = await db.selectFrom("ImageSource")
                .leftJoin("AudioSource", "AudioSource.embeddedImageSourceId", "ImageSource.id")
                .select(["ImageSource.path", "ImageSource.format", "AudioSource.embeddedImageSourceId as embedded"])
                .where("ImageSource.id", "=", id)
                .executeTakeFirstOrThrow();

            if (!resizeMinDimension) {
                const stream = createReadStream(
                    await getImagePath(
                        id,
                        imageSource.path,
                        imageSource.embedded != null
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
                    imageSource.embedded != null
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
