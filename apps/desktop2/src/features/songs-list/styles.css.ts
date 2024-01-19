import {style} from "@vanilla-extract/css";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

export const containerClass = style({
    maxWidth: size(368),
    height: "100%",
    margin: "0 auto",
    padding: `${size(16)} ${size(8)}`
});

export const tableClass = style({
    width: "100%",
    height: "100%"
});

export const tableHeaderClass = style({
    display: "flex",
    alignItems: "center",
    justifyContent: "start",
    gap: size(3),
    height: size(6)
});

export const tableHeaderItemClass = style({
    color: colours.textSecondary,
    fontFamily: fonts.text,
    fontSize: size(3),
    fontWeight: 500,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    textAlign: "start"
});

export const listClass = style({
    "::-webkit-scrollbar": {
        width: size(2)
    },

    "::-webkit-scrollbar-thumb": {
        backgroundColor: lm(colour("grey", 40), colour("grey", 60)),
        minHeight: size(8),
        borderRadius: size(1)
    },

    "::-webkit-scrollbar-track": {
        backgroundColor: lm(colour("grey", 10), colour("grey", 90)),
        borderRadius: size(1)
    }
});

export const tableRowClass = style({
    display: "flex",
    gap: size(3),
    height: "52px",
    alignItems: "center",
    borderRadius: 6,
    ":hover": {
        backgroundColor: lm(colour("grey", 10), colour("grey", 90))
    }
});

export const tableCellClass = style({
    color: colours.text,
    fontFamily: fonts.text,
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap"
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

export const indexColumnClass = style({
    flexBasis: "50px",
    color: colours.textSecondary,
    textAlign: "center"
});

export const artworkColumnClass = style({
    width: "48px",
    flexShrink: 0
});

export const titleColumnClass = style({
    flexGrow: 1,
    flexBasis: "200px"
});

export const artistColumnClass = style({
    flexGrow: 1,
    flexBasis: "150px"
});

export const albumColumnClass = style({
    flexGrow: 1,
    flexBasis: "100px"
});

export const timeColumnClass = style({
    flexGrow: 1,
    flexBasis: "50px",
    minWidth: "50px"
});
