import {router} from "../../trpc.ts";
import {getTrackInfo} from "./get.ts";
import {list} from "./list.ts";
import {getWaveformOverview} from "./waveform-overview.ts";

export const tracks = router({
    list,
    getWaveformOverview,
    getTrackInfo
});
