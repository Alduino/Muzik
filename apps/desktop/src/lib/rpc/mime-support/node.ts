import {invoke} from "../../ipc/main";
import {Target} from "../../window-ids";
import {event} from "./common";

export default function supportsMimeType(
    mimeType: string,
    target = Target.main
): Promise<boolean> {
    return invoke(target)(event, {mimeType}).then(({supported}) => supported);
}
