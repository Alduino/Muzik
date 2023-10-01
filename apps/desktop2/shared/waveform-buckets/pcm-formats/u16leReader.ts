import {DataReader} from "../DataReader.ts";

const SAMPLE_SIZE = 2;
const MAX_VALUE = 0xffff;

/**
 * Creates a data reader that reads unsigned 16-bit little endian integers from a DataView.
 * Returns zero for out-of-bounds reads.
 *
 * @param startOffset - The starting offset to read from in the DataView in bytes (default is 0).
 */
export function u16leReader(startOffset = 0): DataReader<DataView> {
    return {
        read(data, offset) {
            const byteOffset = startOffset + offset * SAMPLE_SIZE;
            if (byteOffset > data.byteLength - SAMPLE_SIZE) return 0;

            return data.getUint16(byteOffset, true) / MAX_VALUE;
        },
        getLength(data) {
            return data.byteLength / SAMPLE_SIZE;
        }
    };
}
