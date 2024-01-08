import {db} from "../db.ts";

export async function findBestAudioSource(trackId: number): Promise<number> {
    const {id} = await db.selectFrom("AudioSource")
        .where("trackId", "=", trackId)
        .orderBy("bitrate", "desc")
        .select("id")
        .executeTakeFirstOrThrow();

    return id;
}
