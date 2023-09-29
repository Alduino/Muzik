import {style} from "@vanilla-extract/css";
import {size} from "../../../theme/size.ts";
import {fonts} from "../../../theme/theme.ts";

export const itemContainerClass = style({
    display: "flex",
    alignItems: "center",
    gap: size(2),
    marginBottom: size(1)
});

export const itemPathClass = style({
    flexGrow: 1,
    fontFamily: fonts.mono,
    fontSize: size(3.25)
});

export const textboxClass = style({
    flexGrow: 1
});

export const adderContainerClass = style({
    display: "flex",
    alignItems: "stretch",
    gap: size(2)
});
