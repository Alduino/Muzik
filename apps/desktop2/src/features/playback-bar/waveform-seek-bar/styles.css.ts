import {style} from "@vanilla-extract/css";
import {colour} from "../../../theme/colour.ts";
import {lm} from "../../../theme/lm.ts";
import {size} from "../../../theme/size.ts";
import {colours, fonts} from "../../../theme/theme.ts";

export const containerClass = style({
    flexGrow: 1,
    alignSelf: "stretch",
    position: "relative"
});

export const canvasClass = style({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    cursor: "grab",

    ":active": {
        cursor: "grabbing"
    }
});

export const timeIndicatorContainerClass = style({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",

    display: "flex",
    alignItems: "center",
    gap: size(2),
    padding: `${size(1)} ${size(2)}`,
    backgroundColor: lm(
        colour("grey", 0, 0.6),
        colour("grey", 100, 0.4)
    ),
    color: colours.text,
    fontFamily: fonts.mono,
    fontSize: size(3),
    backdropFilter: "blur(8px)",
    borderRadius: size(1),

    transition: "opacity 100ms ease-in-out",

    selectors: {
        [`${containerClass}:hover &`]: {
            opacity: 0
        }
    }
});
