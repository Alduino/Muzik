import {colour} from "./colour.ts";
import {lm} from "./lm.ts";

export const fonts = {
    text: "'Cabin Variable', sans-serif",
    mono: "'IBM Plex Mono', monospace"
};

export const colours = {
    text: lm(colour("grey", 100), colour("grey", 0)),
    textSecondary: lm(colour("grey", 70), colour("grey", 30))
};
