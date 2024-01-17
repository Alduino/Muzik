import {ExecaChildProcess} from "execa";
import {childLogger} from "../../../shared/logger.ts";
import {PLAYBACK_CHANNELS, PLAYBACK_SAMPLE_RATE, PLAYBACK_SAMPLE_SIZE} from "../constants.ts";
import {EventEmitter} from "../utils/EventEmitter.ts";
import {ffargs, runFfmpeg} from "../utils/ffmpeg.ts";

const log = childLogger("track-read-stream");

const PACKET_DURATION_SECONDS = 0.5;

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
    #closedEvent = new EventEmitter();
    #closed = false;

    #offset = 0;
    #process: ExecaChildProcess<Buffer> | undefined;

    #inhibitEnd = new WeakSet<ExecaChildProcess<Buffer>>();

    get closeEvent() {
        return this.#closedEvent.getListener();
    }

    constructor(private readonly path: string) {
        this.#openFfmpeg(0);
    }

    get currentFrame() {
        return bytesToFrames(this.#offset);
    }

    async readNextPacket(): Promise<AudioPacket | undefined> {
        const data = await this.#read();
        if (data.length === 0) return undefined;

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
        log.debug("Closing ffmpeg stream");
        this.#closeFfmpeg();
        this.#closedEvent.emit();
        this.#closed = true;
    }

    seekApprox(containingFrame: number) {
        // Keep the offset a multiple of `PACKET_DURATION_SECONDS`

        if (this.#process) {
            this.#inhibitEnd.add(this.#process);
            this.#closeFfmpeg();
        }

        this.#openFfmpeg(containingFrame);
    }

    #closeFfmpeg() {
        if (!this.#process) {
            log.warn("Attempted to close ffmpeg when it was not open");
            return;
        }

        log.debug("Killing ffmpeg");

        const process = this.#getProcess();
        process.kill();
        this.#process = undefined;
    }

    #openFfmpeg(containingFrame: number) {
        if (this.#closed) {
            log.warn("Attempted to open ffmpeg when it was closed");
            return;
        }

        log.debug("Opening ffmpeg");

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
        const process = this.#process;
        if (!process) return Buffer.alloc(0);

        const ds = this.#getDataStream();
        const size = framesToBytes(secondsToFrames(PACKET_DURATION_SECONDS));

        let ended = false;

        const result = await new Promise<Buffer>((resolve, reject) => {
            let bytesRead = 0;
            const chunks: Buffer[] = [];

            if (ds.readableEnded) {
                ended = true;
                resolve(Buffer.alloc(0));
                return;
            }

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

                ended = true;
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

        if (ended) {
            log.debug("Reached end of stream");
            this.#closeFfmpeg();
        }

        return result;
    }
}

export class TrackReadStream {
    #packetReader: PacketReader;

    #currentlyRequestedPacketFrame: number | null = null;
    #currentlyRequestedPacket: Promise<AudioPacket | undefined> | null = null;

    #lastPacket: AudioPacket | null = null;

    get closeEvent() {
        return this.#packetReader.closeEvent;
    }

    constructor(path: string) {
        this.#packetReader = new PacketReader(path);
    }

    async requestPacket(
        containingFrame: number
    ): Promise<AudioPacket | undefined> {
        if (this.#currentlyRequestedPacket) {
            const result = await this.#currentlyRequestedPacket;
            if (containingFrame === this.#currentlyRequestedPacketFrame) return result;
        }
        const newRequest = this.#requestPacket(containingFrame);

        this.#currentlyRequestedPacket = newRequest;
        this.#currentlyRequestedPacketFrame = containingFrame;

        const result = await newRequest;

        this.#currentlyRequestedPacket = null;
        this.#currentlyRequestedPacketFrame = null;

        return result;
    }

    close() {
        log.debug("Closing track read stream");
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

        if (containingFrame < this.#packetReader.currentFrame) {
            this.#packetReader.seekApprox(containingFrame);
        }

        for (; ;) {
            const packet = await this.#packetReader.readNextPacket();

            if (!packet) {
                log.trace("No more packets left to read");
                return;
            }

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
    }
}
