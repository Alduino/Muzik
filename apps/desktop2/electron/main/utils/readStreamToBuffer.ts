import {Readable} from "stream";

export function readStreamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        function onData(chunk: Buffer) {
            chunks.push(chunk);
        }

        function onEnd() {
            resolve(Buffer.concat(chunks));
            cleanup();
        }

        function onError(error: Error) {
            reject(error);
            cleanup();
        }

        function cleanup() {
            stream.off("data", onData);
            stream.off("end", onEnd);
            stream.off("error", onError);
        }

        stream.on("data", onData);
        stream.on("end", onEnd);
        stream.on("error", onError);
    });
}
