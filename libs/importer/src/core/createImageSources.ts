import {log} from "../logger";
import {getContext} from "../utils/context";
import {AudioSourceMetadataWithId} from "./getMetadata";

export async function createImageSources(
    audioSourceMetadataWithIds: AudioSourceMetadataWithId[]
): Promise<ReadonlyMap<number, number>> {
    const {db} = getContext();

    const audioSourceIdToExternalImageSourceIds = new Map<number, number[]>();
    const audioSourceIdToEmbeddedImageSourceId = new Map<number, number>();

    log.debug("Creating image sources");

    await db.transaction().execute(async trx => {
        for (const metadata of audioSourceMetadataWithIds) {
            for (const imageSource of metadata.externalImageSources) {
                const {id} = await trx.insertInto("ImageSource")
                    .values({
                        updatedAt: new Date().toISOString(),
                        path: imageSource.path,
                        format: imageSource.format,
                        width: imageSource.width,
                        height: imageSource.height
                    })
                    .onConflict(oc => {
                        return oc.doUpdateSet({
                            updatedAt: new Date().toISOString(),
                            format: imageSource.format,
                            width: imageSource.width,
                            height: imageSource.height
                        })
                    })
                    .returning("id")
                    .executeTakeFirstOrThrow();

                if (!audioSourceIdToExternalImageSourceIds.has(metadata.id)) {
                    audioSourceIdToExternalImageSourceIds.set(metadata.id, []);
                }

                audioSourceIdToExternalImageSourceIds.get(metadata.id)!.push(id);
            }

            if (metadata.embeddedImageSource) {
                const {id} = await trx.selectFrom("ImageSource")
                    .where("path", "=", metadata.path)
                    .select("id")
                    .executeTakeFirstOrThrow();

                audioSourceIdToEmbeddedImageSourceId.set(metadata.id, id);
            }
        }
    });

    const imageSourceIdToAudioSourceId = new Map<number, number>();

    for (const [audioSourceId, externalImageSourceIds] of audioSourceIdToExternalImageSourceIds) {
        for (const externalImageSourceId of externalImageSourceIds) {
            imageSourceIdToAudioSourceId.set(externalImageSourceId, audioSourceId);
        }
    }

    for (const [audioSourceId, embeddedImageSourceId] of audioSourceIdToEmbeddedImageSourceId) {
        imageSourceIdToAudioSourceId.set(embeddedImageSourceId, audioSourceId);
    }

    return imageSourceIdToAudioSourceId;
}
