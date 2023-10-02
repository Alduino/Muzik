import {PLAYBACK_CHANNELS, PLAYBACK_SAMPLE_SIZE} from "../../main/constants.ts";
import {observable} from "../../main/utils/Observable.ts";

interface Packet {
    // Inclusive
    startFrame: number;

    // Exclusive
    endFrame: number;

    buffer: Buffer;
}

interface CurrentPacket {
    packet: Packet;
    offset: number;
}

/**
 * Manages loading the audio data for a specific track.
 */
export class TrackAudioBuffer {
    #currentPacket: CurrentPacket | null = null;
    #packets = new Set<Packet>();

    #persistentPackets = new Set<Packet>();

    #done = false;

    get #currentFrame() {
        if (this.#currentPacket) {
            // Assumes `#currentPacket` is never set back to null.
            return (
                this.#currentPacket.packet.startFrame +
                this.#currentPacket.offset
            );
        } else {
            return 0;
        }
    }

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
    ) {}

    end() {
        this.#done = true;
    }

    done() {
        return this.#done;
    }

    /**
     * Import a packet into the buffer.
     *
     * @param buffer The audio data. Must be an integer number of frames.
     * @param startFrame The frame that the packet starts at.
     * @param persistent If true, the packet will be kept buffered even after it is used.
     */
    importPacket(buffer: Buffer, startFrame: number, persistent = false) {
        const frameCount =
            buffer.byteLength / PLAYBACK_SAMPLE_SIZE / PLAYBACK_CHANNELS;

        const packet: Packet = {
            buffer,
            startFrame,
            endFrame: startFrame + frameCount
        };

        // TODO: Handle memory leak if this packet doesn't end up being used.
        this.#packets.add(packet);

        if (persistent) {
            this.#persistentPackets.add(packet);
        }
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

        // TODO
    }

    /**
     * Sets `#currentPacket` to the first buffered packet that contains `frame`.
     *
     * The new packet is also removed from the set of buffered packets.
     *
     * If no packet contains `frame`, a new packet is requested.
     */
    #usePacketAtFrame(frame: number) {
        const packets = this.#packets;

        let newPacket: Packet | undefined = undefined;

        for (const packet of packets) {
            if (packet.startFrame > frame) continue;
            if (packet.endFrame <= frame) continue;

            newPacket = packet;
        }

        if (!newPacket) {
            this.#requestPacket(frame);
            return null;
        }

        if (!this.#persistentPackets.has(newPacket)) {
            this.#packets.delete(newPacket);
        }

        this.#currentPacket = {
            packet: newPacket,
            offset: frame - newPacket.startFrame
        };

        // So that it's ready when we need it.
        this.#requestPacket(newPacket.endFrame);
    }

    /**
     * Sets `#currentPacket` to the next buffered packet.
     */
    #nextPacket() {
        const newPacketStartFrame = this.#currentPacket?.packet.endFrame ?? 0;
        this.#usePacketAtFrame(newPacketStartFrame);
    }

    /**
     * Attempts to read `maxSize` bytes from the current packet.
     *
     * If `maxSize` is greater than the number of bytes remaining in the current packet,
     * only the remaining bytes will be read.
     */
    #read(maxSize: number): Buffer {
        if (!this.#currentPacket) return Buffer.alloc(0);

        const {packet, offset} = this.#currentPacket;

        const readableBytes = Math.min(maxSize, packet.buffer.length - offset);
        this.#currentPacket.offset += readableBytes;

        this.#currentFrameObserver.set(this.#currentFrame);

        return packet.buffer.subarray(offset, offset + readableBytes);
    }

    read(size: number) {
        if (this.#done) {
            return null;
        }

        const result = new Array<Buffer>();
        const totalSize = 0;

        while (totalSize < size) {
            const sizeToRead = size - totalSize;
            const next = this.#read(sizeToRead);

            if (next.byteLength === 0) {
                this.#nextPacket();
            } else {
                result.push(next);
            }
        }

        if (this.frameCount && this.#currentFrame >= this.frameCount) {
            this.end();
        }

        return Buffer.concat(result);
    }

    seek(newFrame: number) {
        this.#usePacketAtFrame(newFrame);
    }
}
