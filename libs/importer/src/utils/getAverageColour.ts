import Piscina from "piscina";

// Will run locally if the worker is not defined
export async function getAverageColour(
    imageBuffer: ArrayBuffer,
    mimeType: string,
    worker: Piscina
) {
    const [result, durationMs] = await worker.run(
        {buffer: imageBuffer, mimeType},
        {
            transferList: [imageBuffer]
        }
    );

    return [result as {hex: string}, durationMs as number] as const;
}
