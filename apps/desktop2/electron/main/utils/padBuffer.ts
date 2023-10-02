export function padBuffer(buffer: Buffer, minLength: number): Buffer {
    if (buffer.length >= minLength) return buffer;

    const padding = Buffer.alloc(minLength - buffer.length);

    return Buffer.concat([buffer, padding]);
}
