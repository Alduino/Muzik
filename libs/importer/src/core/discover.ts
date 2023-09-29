import {resolve} from "path";
import {fileURLToPath, URL} from "url";
import Piscina from "piscina";
import {readdirIterator} from "readdir-enhanced";
import {log} from "../logger";
import {calculateArtworkAverageColours} from "./calculateArtworkAverageColours";
import {createArtwork} from "./createArtwork";
import {createImageSources} from "./createImageSources";
import {createMetadata} from "./createMetadata";
import {createTracks} from "./createTracks";
import {
    insertAudioSourceMetadata,
    linkAudioSourceMetadataIds,
    loadMetadata
} from "./getMetadata";

export async function discoverSources(dirs: string[]) {
    // Stream allows simple pause/resume
    const streams = dirs.map(dir =>
        readdirIterator(dir, {
            deep: true,
            filter: stats => stats.isFile(),
            basePath: resolve(dir)
        })
    );

    const path = "./workers/hashBuffer.cjs";
    const hashWorkerPool = new Piscina({
        filename: fileURLToPath(new URL(path, import.meta.url)),
        maxQueue: "auto",
        idleTimeout: 500
    });

    const sourcePaths: string[] = [];

    for (const stream of streams) {
        for await (const path of stream) {
            sourcePaths.push(path);
        }
    }

    const audioSourceMetadata = await loadMetadata(sourcePaths, {
        hashWorkerPool
    });

    await hashWorkerPool.destroy();

    log.debug(
        {
            runTime: hashWorkerPool.runTime,
            waitTime: hashWorkerPool.waitTime
        },
        "Metadata worker stats"
    );

    await insertAudioSourceMetadata(audioSourceMetadata);

    const audioSourceMetadataWithIds =
        await linkAudioSourceMetadataIds(audioSourceMetadata);

    await createTracks(audioSourceMetadataWithIds);

    await createMetadata(audioSourceMetadataWithIds);

    const imageSourceIdToAudioSourceId = await createImageSources(
        audioSourceMetadataWithIds
    );

    const imageFingerprintPath = "./workers/getImageFingerprint.cjs";
    const fingerprintWorkerPool = new Piscina({
        filename: fileURLToPath(new URL(imageFingerprintPath, import.meta.url)),
        maxQueue: "auto",
        idleTimeout: 500
    });

    await createArtwork(imageSourceIdToAudioSourceId, {
        fingerprintWorkerPool
    });

    await fingerprintWorkerPool.destroy();

    const avgColourPath = "./workers/getAverageColour.cjs";
    const averageColourWorkerPool = new Piscina({
        filename: fileURLToPath(new URL(avgColourPath, import.meta.url)),
        maxQueue: "auto",
        idleTimeout: 500
    });

    await calculateArtworkAverageColours({
        averageColourWorkerPool
    });

    await averageColourWorkerPool.destroy();
}
