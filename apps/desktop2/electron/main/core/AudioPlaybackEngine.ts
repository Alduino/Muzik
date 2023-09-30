import {prisma} from "../prisma.ts";
import {SubscribableState} from "../utils/SubscribableState.ts";

export class AudioPlaybackEngine {
    readonly currentTrackId = new SubscribableState<number | null>(null);
    readonly seekPosition = new SubscribableState<number>(0);

    constructor() {
        this.currentTrackId.onChange(() => {
            this.seekPosition.set(0);
        });
    }

    async play() {
        const currentTrackId = this.currentTrackId.get();
        if (!currentTrackId) return;

        const [{duration}] = await prisma.track
            .findUniqueOrThrow({
                where: {
                    id: currentTrackId
                }
            })
            .sources({
                take: 1,
                select: {
                    duration: true
                }
            });

        // TEMPORARY. For now we just start incrementing the seek position.

        const interval = setInterval(() => {
            this.seekPosition.set(prev => prev + 0.1 / duration);
        }, 100);

        this.currentTrackId.onChange(() => {
            clearInterval(interval);
        });
    }
}

export const audioPlaybackEngine = new AudioPlaybackEngine();
