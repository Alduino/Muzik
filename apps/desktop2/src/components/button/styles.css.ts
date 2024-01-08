import {style} from "@vanilla-extract/css";
import {recipe} from "@vanilla-extract/recipes";
import {colour} from "../../theme/colour.ts";
import {lm} from "../../theme/lm.ts";
import {size} from "../../theme/size.ts";
import {colours, fonts} from "../../theme/theme.ts";

export const containerStyle = recipe({
    base: {
        display: "flex",
        gap: size(2),
        alignItems: "center",
        padding: `${size(2)} ${size(3)}`,
        border: "none",
        borderRadius: 6,
        backgroundColor: lm(colour("grey", 5), colour("grey", 90)),
        color: colours.text,
        fontFamily: fonts.text,
        textDecoration: "none",
        outline: `2px solid ${lm(colour("grey", 0), colour("grey", 100))}`,

        ":disabled": {
            opacity: 0.75,
            cursor: "not-allowed"
        },

        selectors: {
            "&:not(:disabled):hover": {
                backgroundColor: lm(colour("grey", 10), colour("grey", 80))
            }
        }
    },
    variants: {
        iconOnly: {
            true: {
                padding: size(2)
            }
        },
        fullWidth: {
            true: {
                width: "100%",
                justifyContent: "space-between"
            }
        }
    }
});

export const iconClass = style({
    width: size(4),
    height: size(4)
});
