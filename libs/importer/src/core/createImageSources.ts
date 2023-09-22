import {PrismaPromise} from "@muzik/db";
import {log} from "../logger";
import {getContext} from "../utils/context";
import {AudioSourceMetadataWithId} from "./getMetadata";

export async function createImageSources(
    audioSourceMetadataWithIds: AudioSourceMetadataWithId[]
): Promise<ReadonlyMap<number, number>> {
    const {db} = getContext();

    const audioSourceIdToEmbeddedImageSourceId = new Map<number, number>();
    const audioSourceIdToTransactionResultIndex = new Map<number, number[]>();

    const transactionQueries: PrismaPromise<{id: number}>[] = [];

    for (const metadata of audioSourceMetadataWithIds) {
        for (const imageSource of metadata.externalImageSources) {
            const index =
                transactionQueries.push(
                    db.imageSource.upsert({
                        where: {
                            path: imageSource.path
                        },
                        update: {
                            format: imageSource.format,
                            width: imageSource.width,
                            height: imageSource.height
                        },
                        create: imageSource
                    })
                ) - 1;

            if (!audioSourceIdToTransactionResultIndex.has(metadata.id)) {
                audioSourceIdToTransactionResultIndex.set(metadata.id, []);
            }

            audioSourceIdToTransactionResultIndex.get(metadata.id)!.push(index);
        }

        if (metadata.embeddedImageSource) {
            const {id} = await db.imageSource.findUniqueOrThrow({
                where: {
                    path: metadata.path
                },
                select: {
                    id: true
                }
            });

            audioSourceIdToEmbeddedImageSourceId.set(metadata.id, id);
        }
    }

    log.debug("Creating %s external image sources", transactionQueries.length);

    const transactionResults = await db.$transaction(transactionQueries);

    const imageSourceIdToAudioSourceId = new Map<number, number>();

    for (const [
        audioSourceId,
        transactionResultIndexes
    ] of audioSourceIdToTransactionResultIndex) {
        const imageSourceIds = transactionResultIndexes.map(
            index => transactionResults[index].id
        );

        for (const imageSourceId of imageSourceIds) {
            imageSourceIdToAudioSourceId.set(imageSourceId, audioSourceId);
        }
    }

    // Embedded image sources are added in a separate batch to optimise transaction size later
    // When they are interleaved, the transaction size is small because dependencies are right next to each other
    for (const [
        audioSourceId,
        embeddedImageSourceId
    ] of audioSourceIdToEmbeddedImageSourceId) {
        imageSourceIdToAudioSourceId.set(embeddedImageSourceId, audioSourceId);
    }

    return imageSourceIdToAudioSourceId;
}
