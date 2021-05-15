import {handle} from "../../ipc/renderer";
import {event} from "./common";

export default function handleSupportsMimeType(
    handler: (mimeType: string) => Promise<boolean>
): void {
    handle(event, ({mimeType}) =>
        handler(mimeType).then(supported => ({supported}))
    );
}
