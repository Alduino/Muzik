import {style} from "@vanilla-extract/css";
import {colour} from "../../../theme/colour.ts";
import {lm} from "../../../theme/lm.ts";
import {size} from "../../../theme/size.ts";
import {colours, fonts} from "../../../theme/theme.ts";

export const containerClass = style({
    display: "flex",
    gap: size(4),
    alignItems: "center",
    padding: size(4),
    backgroundColor: lm(colour("grey", 5), colour("grey", 80))
});

export const imgClass = style({
    width: size(5),
    height: size(5)
});

export const titleClass = style({
    fontFamily: fonts.text,
    fontSize: size(4),
    lineHeight: 1,
    color: colours.text
});
