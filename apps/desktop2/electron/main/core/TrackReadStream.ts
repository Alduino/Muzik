import {
    PLAYBACK_CHANNELS,
    PLAYBACK_SAMPLE_RATE,
    PLAYBACK_SAMPLE_SIZE
} from "../constants.ts";
import {EventEmitter} from "../utils/EventEmitter.ts";
import {ffargs, runFfmpeg} from "../utils/ffmpeg.ts";

const PACKET_DURATION_SECONDS = 1;

interface AudioPacket {
    buffer: Buffer;

    // Inclusive
    startFrame: number;

    // Exclusive
    endFrame: number;
}

class PacketReader {
    static #bytesToFrames(offset: number) {
        return offset / (PLAYBACK_CHANNELS * PLAYBACK_SAMPLE_SIZE);
    }

    static #framesToBytes(frame: number) {
        return Math.floor(frame * PLAYBACK_CHANNELS * PLAYBACK_SAMPLE_SIZE);
    }

    static #framesToSeconds(frame: number) {
        return frame / PLAYBACK_SAMPLE_RATE;
    }

    #closed = new EventEmitter();

    #currentlyReadingPromise: Promise<AudioPacket | undefined> | undefined;

    #offset = 0;

    get currentFrame() {
        return PacketReader.#bytesToFrames(this.#offset);
    }

    constructor(private readonly path: string) {}

    // Returns undefined if the stream ends
    async readNextPacket(): Promise<AudioPacket | undefined> {
        if (this.#currentlyReadingPromise) {
            return await this.#currentlyReadingPromise;
        }

        const promise = this.#readPacket();

        this.#currentlyReadingPromise = promise;
        const result = await promise;
        this.#currentlyReadingPromise = undefined;
        return result;
    }

    close() {
        this.#closed.emit();
    }

    async #readPacket(): Promise<AudioPacket | undefined> {
        const ffmpeg = await runFfmpeg(
            "mpeg",
            ffargs()
                .add(
                    "ss",
                    PacketReader.#framesToSeconds(this.currentFrame).toString()
                )
                .add("t", PACKET_DURATION_SECONDS.toString())
                .add("i", this.path)
                .add("f", "s32le")
                .add("ar", PLAYBACK_SAMPLE_RATE.toString())
                .add("ac", PLAYBACK_CHANNELS.toString())
                .addRaw("-")
        );

        const data = ffmpeg.stdout;

        if (data == null) {
            this.close();
            return;
        }

        const startFrame = PacketReader.#bytesToFrames(this.#offset);

        const endByte = this.#offset + data.byteLength;

        const endFrame = PacketReader.#roundFrame(
            PacketReader.#bytesToFrames(endByte),
            "ceil"
        );

        this.#offset = PacketReader.#framesToBytes(endFrame);

        return {
            buffer: data,
            startFrame,
            endFrame
        };
    }

    seekApprox(containingFrame: number) {
        // Keep the offset a multiple of `PACKET_DURATION_SECONDS`

        this.#offset = PacketReader.#framesToBytes(
            PacketReader.#roundFrame(containingFrame, "floor")
        );
    }

    static #roundFrame(endFrame: number, direction: "floor" | "ceil") {
        const multiplier = PACKET_DURATION_SECONDS * PLAYBACK_SAMPLE_RATE;

        if (direction === "floor") {
            return Math.floor(endFrame / multiplier) * multiplier;
        } else {
            return Math.ceil(endFrame / multiplier) * multiplier;
        }
    }
}

export class TrackReadStream {
    #packetReader: PacketReader;

    #requestingPackets = new Map<number, Promise<AudioPacket | undefined>>();

    #lastPacket: AudioPacket | null = null;

    constructor(path: string) {
        this.#packetReader = new PacketReader(path);
    }

    async #requestPacket(
        containingFrame: number
    ): Promise<AudioPacket | undefined> {
        if (this.#lastPacket) {
            if (
                this.#lastPacket.startFrame <= containingFrame &&
                containingFrame < this.#lastPacket.endFrame
            ) {
                return this.#lastPacket;
            }
        }

        if (containingFrame < this.#packetReader.currentFrame) {
            this.#packetReader.seekApprox(containingFrame);
        }

        for (;;) {
            const packet = await this.#packetReader.readNextPacket();
            if (!packet) break;

            this.#lastPacket = packet;

            if (
                packet.startFrame <= containingFrame &&
                containingFrame < packet.endFrame
            ) {
                return packet;
            }
        }

        return undefined;
    }

    async requestPacket(
        containingFrame: number
    ): Promise<AudioPacket | undefined> {
        const existingRequest = this.#requestingPackets.get(containingFrame);
        if (existingRequest) return await existingRequest;

        const newRequest = this.#requestPacket(containingFrame);

        this.#requestingPackets.set(containingFrame, newRequest);

        const result = await newRequest;

        this.#requestingPackets.delete(containingFrame);

        return result;
    }
}
