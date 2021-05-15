import {handle} from "../../ipc/renderer";
import {event} from "./common";

export default function handleGetAverageColour(
    cb: (mimeType: string, data: Uint8Array) => Promise<string>
): void {
    handle(event, ({mimeType, data}) =>
        cb(mimeType, data).then(colour => ({colour}))
    );
}
