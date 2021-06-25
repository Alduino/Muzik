import React from "react";
import {render} from "react-dom";
import {I18nextProvider} from "react-i18next";
import {Root} from "./Root";
import initialiseMuzik from "./muzikInit";
import {i18n, i18nConfig} from "./translations";
import "./ipc-handlers";
import "./base-style.css";

initialiseMuzik();

(async () => {
    if (i18n.isInitialized) return;
    await i18n.init(i18nConfig);

    const rootElement = document.getElementById("main");
    render(
        <>
            <I18nextProvider i18n={i18n}>
                <Root />
            </I18nextProvider>
        </>,
        rootElement
    );
})();
