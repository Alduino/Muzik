import {style} from "@vanilla-extract/css";
import {calc} from "@vanilla-extract/css-utils";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

export const containerClass = style({
    display: "flex",
    alignItems: "center",
    gap: size(4),
    padding: size(4),
    boxShadow: `0 -10px 20px rgba(0, 0, 0, ${lm("0.1", "0.3")})`,
    backgroundColor: lm(colour("grey", 5), colour("grey", 90))
});

export const metadataContainerClass = style({
    display: "flex",
    flexDirection: "column",
    width: calc.subtract(size(64), size(8), "64px")
});

export const trackTitleClass = style({
    fontFamily: fonts.text,
    fontWeight: 500,
    color: colours.text,
    fontSize: size(4),
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
});

export const artistNameClass = style({
    fontFamily: fonts.text,
    color: colours.textSecondary,
    fontSize: size(3.5),
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
});

export const artistLinkClass = style({
    color: colours.textSecondary,
    textDecoration: "none",

    ":hover": {
        textDecoration: "underline"
    }
});
