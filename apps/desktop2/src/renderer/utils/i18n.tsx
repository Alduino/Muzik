import {FluentBundle, FluentResource} from "@fluent/bundle";
import {negotiateLanguages} from "@fluent/langneg";
import {ReactLocalization} from "@fluent/react";

const localeFromPathExtractor = /^\.\.\/locales\/([^/]+)/;
const featureFromPathExtractor = /^\.\.\/locales\/[^/]+\/([^/.]+)/;

const localesRaw: Record<string, {default: FluentResource}> = import.meta.glob(
    "../locales/*/**/*.ftl",
    {eager: true}
);

const locales = new Map<string, FluentBundle>();

for (const [path, {default: resource}] of Object.entries(localesRaw)) {
    const localeName = path.match(localeFromPathExtractor)?.[1];
    const featureName = path.match(featureFromPathExtractor)?.[1];

    if (!localeName || !featureName) {
        console.warn("Failed to extract locale or feature name from", path);
        continue;
    }

    for (const message of resource.body) {
        message.id = `${featureName}.${message.id}`;
    }

    if (locales.has(localeName)) {
        locales.get(localeName)?.addResource(resource);
    } else {
        const bundle = new FluentBundle(localeName);
        bundle.addResource(resource);
        locales.set(localeName, bundle);
    }
}

function* generateBundles(userLocales: readonly string[]) {
    const currentLocales = negotiateLanguages(
        userLocales,
        Array.from(locales.keys()),
        {
            defaultLocale: "en-AU"
        }
    );

    for (const locale of currentLocales) {
        const bundle = locales.get(locale);

        if (!bundle) {
            console.warn("Failed to find locale", locale);
            continue;
        }

        yield bundle;
    }
}

export const l10n = new ReactLocalization(generateBundles(navigator.languages));
