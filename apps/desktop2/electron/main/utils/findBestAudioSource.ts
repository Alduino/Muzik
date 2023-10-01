import {prisma} from "../prisma.ts";

export async function findBestAudioSource(trackId: number): Promise<number> {
    const audioSource = await prisma.audioSource.findFirstOrThrow({
        where: {
            trackId
        },
        orderBy: {
            bitrate: "desc"
        },
        select: {
            id: true
        }
    });

    return audioSource.id;
}
