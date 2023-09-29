import {style} from "@vanilla-extract/css";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

export const containerClass = style({
    maxWidth: size(368),
    margin: "0 auto",
    padding: `${size(16)} ${size(8)}`
});

export const tableClass = style({
    width: "100%"
});

export const tableHeaderClass = style({
    color: colours.textSecondary,
    fontFamily: fonts.text,
    fontSize: size(3),
    fontWeight: "semibold",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    textAlign: "start"
});

export const tableCellClass = style({
    display: "flex",
    color: colours.text,
    fontFamily: fonts.text,
    textOverflow: "ellipsis",
    overflow: "hidden"
});

export const commaClass = style({
    marginInlineEnd: size(1),
    "::before": {
        content: '","'
    }
});

export const cellLinkClass = style({
    textDecoration: "none",
    color: colours.text,
    ":hover": {
        textDecoration: "underline"
    }
});
