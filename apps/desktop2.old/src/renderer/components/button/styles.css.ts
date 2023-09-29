import {style} from "@vanilla-extract/css";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

export const containerClass = style({
    display: "flex",
    gap: size(2),
    alignItems: "center",
    padding: `${size(2)} ${size(3)}`,
    border: "none",
    borderRadius: 6,
    backgroundColor: lm(colour("grey", 10), colour("grey", 90)),
    color: colours.text,
    fontFamily: fonts.text,
    textDecoration: "none",

    ":hover": {
        backgroundColor: lm(colour("grey", 20), colour("grey", 80))
    }
});
