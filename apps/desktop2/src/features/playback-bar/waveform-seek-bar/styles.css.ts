import {style} from "@vanilla-extract/css";

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
