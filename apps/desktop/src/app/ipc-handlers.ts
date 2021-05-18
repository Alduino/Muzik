import {fromByteArray} from "base64-js";
import FastAverageColour from "fast-average-color";
import handleGetAverageColour from "../lib/rpc/average-colour/app";
import handleSupportsMimeType from "../lib/rpc/mime-support/app";

const fac = new FastAverageColour();
handleGetAverageColour(async (mime, buffer) => {
    const dataB64 = fromByteArray(buffer);
    const b64url = `data:${mime};base64,${dataB64}`;
    const result = await fac.getColorAsync(b64url, {
        defaultColor: [0, 0, 0, 255]
    });
    return result.hex;
});

handleSupportsMimeType(mime => {
    const testEl = new Audio();
    const canPlayResult = testEl.canPlayType(mime);
    testEl.remove();
    const canPlay = canPlayResult === "maybe" || canPlayResult === "probably";
    return Promise.resolve(canPlay);
});
