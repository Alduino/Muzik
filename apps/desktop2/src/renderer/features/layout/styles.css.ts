import {globalStyle, style} from "@vanilla-extract/css";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";

globalStyle("html, body, #root", {
    margin: 0,
    padding: 0,
    width: "100%",
    height: "100%"
});

export const outerContainerClass = style({
    width: "100%",
    height: "100%",
    overflow: "hidden"
});

export const containerClass = style({
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "stretch"
});

export const contentClass = style({
    backgroundColor: lm(colour("grey", 0), colour("grey", 100)),
    flexGrow: 1,
    overflow: "auto"
});
