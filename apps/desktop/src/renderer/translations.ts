import LanguageDetector from "i18next-browser-languagedetector";
import i18next, {InitOptions} from "i18next";
import {initReactI18next} from "react-i18next";
import languages from "../locales";

export const i18n = i18next.use(LanguageDetector).use(initReactI18next);

export const i18nConfig: InitOptions = {
    debug: process.env.NODE_ENV !== "production",
    fallbackLng: "en",
    initImmediate: true,
    supportedLngs: Object.keys(languages),
    resources: languages,
    interpolation: {
        escapeValue: false
    }
};
