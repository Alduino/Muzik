import {PLAYBACK_CHANNELS, PLAYBACK_SAMPLE_SIZE} from "../../main/constants.ts";
import {EventEmitter} from "../../main/utils/EventEmitter.ts";
import {observable} from "../../main/utils/Observable.ts";
import {rpc} from "./index.ts";
import {childLogger} from "./log.ts";

const log = childLogger("track-audio-buffer");

interface DataPacket {
    type: "data";

    // Inclusive
    startFrame: number;

    // Exclusive
    endFrame: number;

    buffer: Buffer;
}

interface EofPacket {
    type: "eof";

    startFrame: number;
}

type Packet = DataPacket | EofPacket;

interface CurrentPacket {
    packet: DataPacket;
    offsetBytes: number;
}

/**
 * Manages loading the audio data for a specific track.
 */
export class TrackAudioBuffer {
    #currentPacket: CurrentPacket | null = null;
    #packets = new Set<Packet>();

    #persistentPackets = new Set<Packet>();

    #done = false;

    #seekTargetFrame: number | null = null;

    #endEvent = new EventEmitter();
    /**
     * Used to allow observers to know when the current packet changes.
     * Internally this can be calculated from `#currentPacket`.
     */
    #currentFrameObserver = observable(0);
    /**
     * The offset of the first frame returned in the last `read` call.
     */
    readonly currentFrame = this.#currentFrameObserver.observable();

    /**
     * @param trackId ID of the track that this buffer is for.
     *  Used to read from the cache, and to request new packets.
     * @param frameCount The number of frames after which the buffer will stop.
     *  If not specified, the buffer will continue until calling `.end()`.
     *  The buffer may not stop precisely at this frame, but it will stop at the next `.read()`.
     */
    constructor(
        readonly trackId: number,
        readonly frameCount?: number
    ) {
    }

    get endEvent() {
        return this.#endEvent.getListener();
    }

    get #currentFrame() {
        if (this.#currentPacket) {
            return (
                this.#currentPacket.packet.startFrame +
                this.#currentPacket.offsetBytes /
                (PLAYBACK_SAMPLE_SIZE * PLAYBACK_CHANNELS)
            );
        } else {
            // Assumes `#currentPacket` is never set back to null.
            return 0;
        }
    }

    end() {
        log.debug({trackId: this.trackId}, "Ending track");

        this.#done = true;
        this.#endEvent.emit();
    }

    done() {
        return this.#done;
    }

    /**
     * Import a packet into the buffer.
     *
     * @param buffer The audio data. Must be an integer number of frames.
     *   An empty buffer indicates the end of the stream.
     * @param startFrame The frame that the packet starts at.
     * @param persistent If true, the packet will be kept buffered even after it is used.
     */
    importPacket(buffer: Buffer, startFrame: number, persistent = false) {
        if (buffer.byteLength === 0) {
            log.debug("Received EOF packet, track end is near");

            this.#packets.add({
                type: "eof",
                startFrame
            });

            return;
        }

        const frameCount =
            buffer.byteLength / PLAYBACK_SAMPLE_SIZE / PLAYBACK_CHANNELS;

        if (frameCount !== Math.round(frameCount)) {
            log.warn({frameCount}, "Packet size is not an integer number of frames");
            throw new Error("Packet size is not an integer number of frames");
        }

        const packet: Packet = {
            type: "data",
            buffer: buffer,
            startFrame,
            endFrame: startFrame + frameCount
        };

        // TODO: Handle memory leak if this packet doesn't end up being used.
        this.#packets.add(packet);

        log.trace({startFrame, frameCount}, "Received new packet");

        if (persistent) {
            this.#persistentPackets.add(packet);
        }

        if (this.#seekTargetFrame != null && packet.startFrame <= this.#seekTargetFrame && packet.endFrame > this.#seekTargetFrame) {
            // Start using this packet immediately
            this.#usePacketAtFrame(this.#seekTargetFrame);
        }
    }

    read(size: number) {
        if (this.done()) {
            return null;
        }

        const result = new Array<Buffer>();
        let totalSize = 0;

        while (totalSize < size) {
            const sizeToRead = size - totalSize;
            const next = this.#read(sizeToRead);

            if (next == null) {
                log.trace(
                    {trackId: this.trackId},
                    "No current packet (start of track?); switching to next"
                );
                this.#nextPacket();
                break;
            }

            totalSize += next.byteLength;

            if (next.byteLength === 0) {
                log.trace("Switching to next packet");
                const nextPacketIsReady = this.#nextPacket();

                if (!nextPacketIsReady) {
                    log.warn("Next packet has not loaded yet");
                    break;
                }
            } else {
                result.push(next);
            }
        }

        return Buffer.concat(result);
    }

    seek(newFrame: number) {
        newFrame = Math.floor(newFrame);

        log.info({newFrame, maxFrame: this.frameCount}, "Seeking within track");
        this.#seekTargetFrame = newFrame;
        this.#usePacketAtFrame(newFrame);
    }

    /**
     * Requests the data loader to load a packet that contains the given frame
     * (ideally the frame should be early in the packet).
     *
     * This may take some time to complete.
     * The data loader should call `importPacket` when the packet is ready.
     */
    #requestPacket(frame: number) {
        if (this.frameCount && frame >= this.frameCount) return;

        log.trace({trackId: this.trackId, frame}, "Requesting packet");

        rpc.requestTrackPacket(this.trackId, frame).catch(() => {
            // TODO: display error in UI
            this.end();
        });
    }

    /**
     * Sets `#currentPacket` to the first buffered packet that contains `frame`.
     *
     * The new packet is also removed from the set of buffered packets.
     *
     * If no packet contains `frame`, a new packet is requested.
     */
    #usePacketAtFrame(frame: number) {
        if (this.done()) {
            log.warn("Attempted to activate a packet after the already track ended");
            this.#currentPacket = null;
            return;
        }

        let newPacket: Packet | undefined = undefined;

        for (const packet of this.#packets) {
            if (packet.type === "eof") {
                log.debug("Detected EOF packet signaling end of track");
                this.#currentPacket = null;
                this.end();
                return true;
            }

            if (packet.startFrame > frame) continue;
            if (packet.endFrame <= frame) continue;

            newPacket = packet;
            break;
        }

        if (!newPacket) {
            log.trace({frame}, "Attempted to use packet before it was loaded");

            this.#requestPacket(frame);
            return false;
        }

        if (!this.#persistentPackets.has(newPacket)) {
            this.#packets.delete(newPacket);
        }

        this.#currentPacket = {
            packet: newPacket,
            offsetBytes:
                (frame - newPacket.startFrame) *
                PLAYBACK_SAMPLE_SIZE *
                PLAYBACK_CHANNELS
        };

        log.trace({startFrame: newPacket.startFrame}, "Started next packet");

        // So that it's ready when we need it.
        this.#requestPacket(newPacket.endFrame);

        return true;
    }

    /**
     * Sets `#currentPacket` to the next buffered packet.
     */
    #nextPacket() {
        const newPacketStartFrame = this.#currentPacket?.packet.endFrame ?? 0;
        log.trace("Next packet starts at frame %s", newPacketStartFrame);
        return this.#usePacketAtFrame(newPacketStartFrame);
    }

    /**
     * Attempts to read `maxSize` bytes from the current packet.
     *
     * If `maxSize` is greater than the number of bytes remaining in the current packet,
     * only the remaining bytes will be read.
     */
    #read(maxSize: number): Buffer | null {
        if (!this.#currentPacket) return null;

        const {packet, offsetBytes} = this.#currentPacket;

        const readableBytes = Math.min(
            maxSize,
            packet.buffer.length - offsetBytes
        );
        this.#currentPacket.offsetBytes += readableBytes;

        this.#currentFrameObserver.set(this.#currentFrame);

        return packet.buffer.subarray(offsetBytes, offsetBytes + readableBytes);
    }
}
