import {createVar, globalStyle, style} from "@vanilla-extract/css";

export const SYSTEM_THEME_CLASS = style({}, "system-theme");
export const LIGHT_THEME_CLASS = style({}, "light-theme");
export const DARK_THEME_CLASS = style({}, "dark-theme");

export const isLightThemeVar = createVar();
export const isDarkThemeVar = createVar();

globalStyle(LIGHT_THEME_CLASS, {
    vars: {
        [isLightThemeVar]: "initial",
        [isDarkThemeVar]: ""
    }
});

globalStyle(DARK_THEME_CLASS, {
    vars: {
        [isLightThemeVar]: "",
        [isDarkThemeVar]: "initial"
    }
});

globalStyle(SYSTEM_THEME_CLASS, {
    "@media": {
        "(prefers-color-scheme: light)": {
            vars: {
                [isLightThemeVar]: "initial",
                [isDarkThemeVar]: ""
            }
        },
        "(prefers-color-scheme: dark)": {
            vars: {
                [isLightThemeVar]: "",
                [isDarkThemeVar]: "initial"
            }
        }
    }
});
