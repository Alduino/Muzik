import {style} from "@vanilla-extract/css";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

export const containerClass = style({
    padding: size(6)
});

export const titleClass = style({
    fontSize: size(6),
    fontFamily: fonts.text,
    fontWeight: "bold",
    color: colours.text
});

export const subtitleClass = style({
    fontSize: size(4),
    fontFamily: fonts.text,
    color: colours.textSecondary,
    marginBottom: size(8)
});
