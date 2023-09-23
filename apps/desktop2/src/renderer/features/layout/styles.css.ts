import {style} from "@vanilla-extract/css";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";

export const containerClass = style({
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    alignItems: "stretch"
});

export const contentClass = style({
    backgroundColor: lm(colour("grey", 0), colour("grey", 100)),
    flexGrow: 1,
    overflow: "auto"
});
