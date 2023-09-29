import {style} from "@vanilla-extract/css";
import {colour} from "../../../theme/colour.ts";
import {lm} from "../../../theme/lm.ts";
import {size} from "../../../theme/size.ts";
import {fonts} from "../../../theme/theme.ts";

export const containerClass = style({
    display: "inline-flex",
    flexDirection: "column",
    width: "100%",
    marginBottom: size(4)
});

export const headingClass = style({
    fontSize: size(4),
    marginBottom: size(2),
    fontFamily: fonts.text,
    fontWeight: 500
});

export const dividerClass = style({
    width: "100%",
    height: "1px",
    backgroundColor: lm(colour("grey", 10), colour("grey", 90)),
    border: "none",
    margin: `${size(4)} 0`
});
