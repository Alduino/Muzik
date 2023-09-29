import {createVar, keyframes, style} from "@vanilla-extract/css";
import {recipe} from "@vanilla-extract/recipes";

export const placeholderColourVar = createVar();
export const sizeVar = createVar();

export const containerClass = style({
    aspectRatio: "1 / 1",
    width: sizeVar,
    backgroundColor: placeholderColourVar,
    overflow: "hidden",
    borderRadius: 3
});

const fadeIn = keyframes({
    from: {
        opacity: 0
    },
    to: {
        opacity: 1
    }
});

export const imageStyle = recipe({
    base: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: 0
    },
    variants: {
        loaded: {
            true: {
                animation: `${fadeIn} 200ms ease-out forwards`
            }
        }
    }
});
