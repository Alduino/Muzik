import {ReactLocalization, useLocalization} from "@fluent/react";
import {useCallback} from "react";

export function useTranslation(namespace?: string) {
    const {l10n} = useLocalization();

    return useCallback<typeof ReactLocalization.prototype.getString>(
        (id, ...params) => {
            if (namespace) id = `${namespace}.${id}`;

            const string = l10n.getString(id, ...params);
            const bundle = l10n.getBundle(id);

            if (bundle?._transform) return bundle._transform(string);
            return string;
        },
        [l10n]
    );
}
