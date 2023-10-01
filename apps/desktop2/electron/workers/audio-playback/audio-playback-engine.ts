import {observable} from "../../main/utils/Observable.ts";

const seekPosition = observable(0);

export const audioPlaybackEngine = {
    seekPosition: seekPosition.observable(),
    seek(newPosition: number) {
        console.log("Seeking to", newPosition);
        seekPosition.set(newPosition);
        // TODO
    }
};
