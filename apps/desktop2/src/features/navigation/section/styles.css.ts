import {style} from "@vanilla-extract/css";
import {colour} from "../../../theme/colour.ts";
import {lm} from "../../../theme/lm.ts";
import {size} from "../../../theme/size.ts";
import {fonts} from "../../../theme/theme.ts";

export const containerClass = style({
    padding: size(2)
});

export const titleClass = style({
    padding: `${size(2)} ${size(4)}`,
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: size(3),
    fontFamily: fonts.text,
    letterSpacing: "3%",
    color: lm(colour("grey", 60), colour("grey", 40))
});
