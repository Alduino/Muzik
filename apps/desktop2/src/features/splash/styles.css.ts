import {style} from "@vanilla-extract/css";
import {calc} from "@vanilla-extract/css-utils";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

const SPINNER_SIZE = size(6);

export const pageClass = style({
    width: "100%",
    height: "100%",
    backgroundColor: lm(colour("grey", 0), colour("grey", 100))
});

export const containerClass = style({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: `translate(-50%, -${SPINNER_SIZE})`,
    display: "flex",
    flexDirection: "column",
    gap: size(4),
    alignItems: "center"
});

export const spinnerClass = style({
    borderRadius: "50%",
    border: `1px solid ${lm(colour("grey", 20), colour("grey", 80))}`,
    backgroundColor: lm(colour("grey", 5), colour("grey", 90)),
    padding: size(2),
    fontSize: calc.add(SPINNER_SIZE, size(4)),
    color: lm(colour("grey", 60), colour("grey", 40))
});

export const messageClass = style({
    fontSize: size(4),
    fontFamily: fonts.text,
    color: colours.textSecondary
});
