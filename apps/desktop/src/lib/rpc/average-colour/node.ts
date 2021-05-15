import {invoke} from "../../ipc/main";
import {Target} from "../../window-ids";
import {event} from "./common";

export default function getAverageColour(
    mimeType: string,
    data: Uint8Array,
    target = Target.main
): Promise<string> {
    return invoke(target)(event, {mimeType, data}).then(({colour}) => colour);
}
