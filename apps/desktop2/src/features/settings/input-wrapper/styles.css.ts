import {style} from "@vanilla-extract/css";
import {size} from "../../../theme/size.ts";
import {colours, fonts} from "../../../theme/theme.ts";

export const containerClass = style({
    margin: `${size(2)} 0`
});

export const descriptionClass = style({
    fontSize: size(3),
    fontFamily: fonts.text,
    color: colours.textSecondary
});
