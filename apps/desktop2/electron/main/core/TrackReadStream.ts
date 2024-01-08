import {ExecaChildProcess} from "execa";
import {childLogger} from "../../../shared/logger.ts";
import {PLAYBACK_CHANNELS, PLAYBACK_SAMPLE_RATE, PLAYBACK_SAMPLE_SIZE} from "../constants.ts";
import {EventEmitter} from "../utils/EventEmitter.ts";
import {ffargs, runFfmpeg} from "../utils/ffmpeg.ts";

const log = childLogger("TrackReadStream");

const PACKET_DURATION_SECONDS = 1;

function bytesToFrames(offset: number) {
    return offset / (PLAYBACK_CHANNELS * PLAYBACK_SAMPLE_SIZE);
}

function framesToBytes(frame: number) {
    return Math.floor(frame * PLAYBACK_CHANNELS * PLAYBACK_SAMPLE_SIZE);
}

function framesToSeconds(frame: number) {
    return frame / PLAYBACK_SAMPLE_RATE;
}

function secondsToFrames(seconds: number) {
    return seconds * PLAYBACK_SAMPLE_RATE;
}

interface AudioPacket {
    buffer: Buffer;

    // Inclusive
    startFrame: number;

    // Exclusive
    endFrame: number;
}

class PacketReader {
    #closed = new EventEmitter();

    #offset = 0;
    #process: ExecaChildProcess<Buffer> | undefined;

    constructor(private readonly path: string) {
        this.#openFfmpeg(0);
    }

    get currentFrame() {
        return bytesToFrames(this.#offset);
    }

    // Returns undefined if the stream ends
    async readNextPacket(): Promise<AudioPacket | undefined> {
        const data = await this.#read();
        this.#offset += data.byteLength;

        const startFrame = bytesToFrames(this.#offset - data.byteLength);
        const endFrame = bytesToFrames(this.#offset);

        return {
            buffer: data,
            startFrame,
            endFrame
        };
    }

    close() {
        this.#closed.emit();
    }

    seekApprox(containingFrame: number) {
        // Keep the offset a multiple of `PACKET_DURATION_SECONDS`

        this.#closeFfmpeg();
        this.#openFfmpeg(containingFrame);
    }

    #closeFfmpeg() {
        const process = this.#getProcess();
        process.kill();
        this.#process = undefined;
    }

    #openFfmpeg(containingFrame: number) {
        // Only allows seeking to the second
        const offsetSeconds = Math.floor(framesToSeconds(containingFrame));
        this.#offset = framesToBytes(secondsToFrames(offsetSeconds));

        this.#process = runFfmpeg(
            "mpeg",
            ffargs()
                .add("ss", offsetSeconds.toString())
                .add("i", this.path)
                .add("f", "s32le")
                .add("ar", PLAYBACK_SAMPLE_RATE.toString())
                .add("ac", PLAYBACK_CHANNELS.toString())
                .addRaw("-")
        );
    }

    #getProcess() {
        if (!this.#process) {
            throw new Error("Stream is not open");
        }

        return this.#process;
    }

    #getDataStream() {
        const process = this.#getProcess();
        const stdout = process.stdout;

        if (!stdout) {
            throw new Error("Stream did not open properly");
        }

        return stdout;
    }

    async #read(): Promise<Buffer> {
        const ds = this.#getDataStream();
        const size = framesToBytes(secondsToFrames(PACKET_DURATION_SECONDS));

        const result = await new Promise<Buffer>((resolve, reject) => {
            let bytesRead = 0;
            const chunks: Buffer[] = [];

            function handleReadable() {
                let chunk;

                while ((chunk = ds.read(size - bytesRead)) !== null) {
                    chunks.push(chunk);
                    bytesRead += chunk.byteLength;

                    if (bytesRead >= size) {
                        ds.removeListener("readable", handleReadable);
                        ds.removeListener("end", handleEnd);
                        ds.removeListener("error", handleError);

                        resolve(Buffer.concat(chunks));
                        break;
                    }
                }
            }

            function handleEnd() {
                ds.removeListener("readable", handleReadable);
                ds.removeListener("end", handleEnd);
                ds.removeListener("error", handleError);

                resolve(Buffer.concat(chunks));
            }

            function handleError(err: Error) {
                ds.removeListener("readable", handleReadable);
                ds.removeListener("end", handleEnd);
                ds.removeListener("error", handleError);

                reject(err);
            }

            ds.on("readable", handleReadable);
            ds.once("end", handleEnd);
            ds.once("error", handleError);
        });

        if (result.byteLength < size) {
            this.close();
        }

        return result;
    }
}

export class TrackReadStream {
    #packetReader: PacketReader;

    #requestingPackets = new Map<number, Promise<AudioPacket | undefined>>();

    #lastPacket: AudioPacket | null = null;

    constructor(path: string) {
        this.#packetReader = new PacketReader(path);
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

        for (; ;) {
            const packet = await this.#packetReader.readNextPacket();
            if (!packet) break;

            this.#lastPacket = packet;

            if (
                packet.startFrame <= containingFrame &&
                containingFrame < packet.endFrame
            ) {
                return packet;
            } else {
                log.trace(
                    {
                        packetStart: packet.startFrame,
                        packetEnd: packet.endFrame,
                        searchingFor: containingFrame
                    },
                    "Skipping packet"
                );
            }
        }

        return undefined;
    }
}
