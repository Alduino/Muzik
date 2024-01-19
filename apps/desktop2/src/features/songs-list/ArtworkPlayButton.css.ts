import {style} from "@vanilla-extract/css";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";
import {tableRowClass} from "./styles.css.ts";

const trackArtOverlayClass = style({
    width: "100%",
    height: "100%",
    backgroundColor: lm(colour("grey", 0, 0.8), colour("grey", 100, 0.5))
});

export const playButtonContainerClass = style([
    trackArtOverlayClass, {
        opacity: 0,
        cursor: "pointer",
        border: "none",

        selectors: {
            [`${tableRowClass}:hover &`]: {
                opacity: 1
            }
        }
    }]);

export const playButtonClass = style({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: lm(colour("grey", 100), colour("grey", 0)),
    fontSize: size(8)
});

export const frequencyVisualiserContainerClass = style([
    trackArtOverlayClass,
    {
        padding: size(2)
    }
]);

export const frequencyVisualizerClass = style({
    width: "100%",
    height: "100%"
});
