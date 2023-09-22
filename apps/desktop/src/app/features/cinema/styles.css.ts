import {calc} from "@chakra-ui/react";
import {createVar, style} from "@vanilla-extract/css";
import {alpha, colour} from "../../utils/styling/colour";
import {lm} from "../../utils/styling/lm";
import {size} from "../../utils/styling/size";

export const containerClass = style({
    display: "grid",
    gridTemplateRows: "10fr 1fr",
    height: "100%"
});

export const centerContainerClass = style({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: size(8),
    gridRow: 1
});

export const songInfoContainer = style({
    display: "flex",
    flexDirection: "column",
    gap: size(4)
});

export const songNamesContainer = style({
    display: "flex",
    flexDirection: "column"
});

export const trackTitleClass = style({
    fontSize: size(6),
    fontWeight: "bold"
});

export const dividerClass = style({
    width: "1px",
    height: "60%",
    backgroundColor: lm(colour("grey", 5), colour("grey", 80))
});

export const visualiserBarCount = createVar();

export const visualiserContainerClass = style({
    display: "grid",
    gridTemplateColumns: `repeat(${visualiserBarCount}, 1fr)`,
    gap: size(2),
    alignItems: "end",
    padding: `0 ${size(4)}`
});

export const visualiserHeightVar = createVar();
const barColour = lm(colour("blue", 80), colour("blue", 20));

export const visualiserBarClass = style({
    height: calc.multiply("100%", visualiserHeightVar),
    borderRadius: `${size(1)} ${size(1)} 0 0`,
    border: "1px solid",
    borderBottom: "none",
    borderColor: barColour,
    boxShadow: `0 0 ${size(2)} ${size(1)} ${alpha(barColour, 0.25)} inset`,
    opacity: 0.25
});
