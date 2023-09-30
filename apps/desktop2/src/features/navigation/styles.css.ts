import {style} from "@vanilla-extract/css";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";

export const containerClass = style({
    display: "flex",
    flexDirection: "column",
    gap: size(6),
    width: size(64),
    backgroundColor: lm(colour("grey", 5), colour("grey", 90)),
    overflow: "auto"
});
