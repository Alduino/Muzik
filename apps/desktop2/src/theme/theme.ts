import {colour} from "./colour.ts";
import {lm} from "./lm.ts";

export const fonts = {
    text: "'Cabin Variable', sans-serif"
};

export const colours = {
    text: lm(colour("grey", 100), colour("grey", 0)),
    textSecondary: lm(colour("grey", 80), colour("grey", 20))
};
