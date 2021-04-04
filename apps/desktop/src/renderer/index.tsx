import "regenerator-runtime/runtime";
import React from "react";
import {I18nextProvider} from "react-i18next";
import {render} from "react-dom";
import {i18nConfig, i18n} from "./translations";
import {Root} from "./Root";

(async () => {
    if (i18n.isInitialized) return;

    await i18n.init(i18nConfig);

    const rootElement = document.createElement("div");
    render(
        <I18nextProvider i18n={i18n}>
            <Root />
        </I18nextProvider>,
        rootElement
    );

    document.body.appendChild(rootElement);
})();
