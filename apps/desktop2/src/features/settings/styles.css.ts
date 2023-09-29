import {style} from "@vanilla-extract/css";
import {size} from "../../theme/size.ts";

export const containerClass = style({
    padding: size(4),
    height: "100%",
    columnWidth: size(96)
});
