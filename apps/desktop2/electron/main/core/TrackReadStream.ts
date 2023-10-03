import {ExecaChildProcess} from "execa";
import {log} from "../../../shared/logger.ts";
import {
    PLAYBACK_CHANNELS,
    PLAYBACK_SAMPLE_RATE,
    PLAYBACK_SAMPLE_SIZE
} from "../constants.ts";
import {EventEmitter} from "../utils/EventEmitter.ts";
import {ffargs, runFfmpeg} from "../utils/ffmpeg.ts";

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
        return frame * (PLAYBACK_CHANNELS * PLAYBACK_SAMPLE_SIZE);
    }

    // rounds down to the nearest frame
    static #getRoundByteCount(byteSize: number) {
        return this.#framesToBytes(Math.floor(this.#bytesToFrames(byteSize)));
    }

    #closed = new EventEmitter();

    #currentlyReadingPromise: Promise<AudioPacket | undefined> | undefined;

    #ffmpeg: ExecaChildProcess | undefined;
    #offset = 0;

    #previousPacketExtra: Buffer | null = null;

    get currentFrame() {
        return PacketReader.#bytesToFrames(this.#offset);
    }

    constructor(path: string) {
        this.#ffmpeg = runFfmpeg(
            "mpeg",
            ffargs()
                .add("i", path)
                .add("f", "s32le")
                .add("ar", PLAYBACK_SAMPLE_RATE.toString())
                .add("ac", PLAYBACK_CHANNELS.toString())
                .addRaw("-"),
            {pipe: true}
        );

        this.#ffmpeg.stdout!.on("close", () => {
            this.close();
        });
    }

    // Returns undefined if the stream ends
    async readNextPacket(): Promise<AudioPacket | undefined> {
        if (this.#currentlyReadingPromise) {
            return await this.#currentlyReadingPromise;
        }

        if (!this.#ffmpeg) return undefined;

        if (this.#ffmpeg.stdout!.readableLength > 0) {
            return this.#readPacket();
        }

        const promise = new Promise<AudioPacket | undefined>(
            (resolve, reject) => {
                const handleError = (error: Error) => {
                    this.#ffmpeg?.stdout!.off("readable", handleReadable);
                    cancelClosed();
                    reject(error);
                };

                const handleReadable = () => {
                    this.#ffmpeg?.stdout!.off("error", handleError);
                    cancelClosed();
                    resolve(this.#readPacket());
                };

                const handleClosed = () => {
                    this.#ffmpeg?.stdout!.off("error", handleError);
                    this.#ffmpeg?.stdout!.off("readable", handleReadable);
                    cancelClosed();
                    resolve(undefined);
                };

                this.#ffmpeg!.stdout!.once("error", handleError);
                this.#ffmpeg!.stdout!.once("readable", handleReadable);

                const cancelClosed = this.#closed.listenOnce(handleClosed);
            }
        );

        this.#currentlyReadingPromise = promise;
        const result = await promise;
        this.#currentlyReadingPromise = undefined;
        return result;
    }

    close() {
        if (!this.#ffmpeg) return;

        this.#ffmpeg.kill();
        this.#closed.emit();
        this.#ffmpeg = undefined;
    }

    closed() {
        return !this.#ffmpeg;
    }

    #readPacket(): AudioPacket | undefined {
        const data = this.#ffmpeg?.stdout!.read();

        if (data == null) {
            this.close();
            return;
        }

        const fullData = this.#previousPacketExtra
            ? Buffer.concat([this.#previousPacketExtra, data])
            : data;

        const startFrame = PacketReader.#bytesToFrames(this.#offset);

        const roundLength = PacketReader.#getRoundByteCount(
            fullData.byteLength
        );

        const roundedData = fullData.subarray(0, roundLength);
        this.#previousPacketExtra = fullData.subarray(roundLength);

        const endByte = this.#offset + roundLength;
        const endFrame = PacketReader.#bytesToFrames(endByte);

        this.#offset = endByte;

        return {
            buffer: roundedData,
            startFrame,
            endFrame
        };
    }
}

export class TrackReadStream {
    #packetReader: PacketReader;

    #requestingPackets = new Map<number, Promise<AudioPacket | undefined>>();

    #lastPacket: AudioPacket | null = null;

    constructor(private readonly path: string) {
        this.#packetReader = new PacketReader(path);
    }

    close() {
        this.#packetReader.close();
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

        if (this.#packetReader.closed()) return undefined;

        if (containingFrame < this.#packetReader.currentFrame) {
            log.warn(
                {
                    requestedFrame: containingFrame,
                    currentFrame: this.#packetReader.currentFrame
                },
                "Restarting FFMPEG stream due to request for packet before current frame"
            );

            // Reader can only go forwards, need to restart to emulate going backwards.
            this.#packetReader.close();
            this.#packetReader = new PacketReader(this.path);
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
