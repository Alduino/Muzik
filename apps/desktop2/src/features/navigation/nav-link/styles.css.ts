import {style} from "@vanilla-extract/css";
import {recipe} from "@vanilla-extract/recipes";
import {colour} from "../../../theme/colour.ts";
import {lm} from "../../../theme/lm.ts";
import {size} from "../../../theme/size.ts";
import {colours, fonts} from "../../../theme/theme.ts";

export const linkStyle = recipe({
    base: {
        display: "flex",
        alignItems: "center",
        gap: size(3),
        padding: `${size(2)} ${size(3)}`,
        borderRadius: 6,
        textDecoration: "none",

        ":hover": {
            backgroundColor: lm(colour("grey", 10), colour("grey", 90))
        }
    },
    variants: {
        isActive: {
            true: {},
            false: {}
        },
        isPending: {
            true: {},
            false: {}
        }
    }
});

export const iconClass = style({
    width: size(4),
    height: size(4),

    color: lm(colour("grey", 80), colour("grey", 20)),

    selectors: {
        [`${linkStyle.classNames.variants.isActive.true} &`]: {
            color: lm(colour("blue", 40), colour("blue", 20))
        }
    }
});

export const textClass = style({
    fontFamily: fonts.text,
    fontSize: size(4),
    color: colours.text,

    selectors: {
        [`${linkStyle.classNames.variants.isActive.true} &`]: {
            color: lm(colour("blue", 40), colour("blue", 20))
        }
    }
});
