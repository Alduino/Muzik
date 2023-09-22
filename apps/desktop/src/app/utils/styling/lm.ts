import {fallbackVar} from "@vanilla-extract/css";
import {isDarkThemeVar, isLightThemeVar} from "./colour-scheme.css";

export function lm(light: string, dark: string): string {
    return [
        fallbackVar(isLightThemeVar, light),
        fallbackVar(isDarkThemeVar, dark)
    ].join(" ");
}
