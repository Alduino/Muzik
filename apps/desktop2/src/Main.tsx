import {LocalizationProvider} from "@fluent/react";
import {ReactElement} from "react";
import {RouterProvider} from "react-router-dom";
import {TrpcProvider} from "./components/TrpcProvider.tsx";
import {router} from "./router.ts";
import {l10n} from "./utils/i18n.tsx";

export function Main(): ReactElement {
    return (
        <LocalizationProvider l10n={l10n}>
            <TrpcProvider>
                <RouterProvider router={router} />
            </TrpcProvider>
        </LocalizationProvider>
    );
}
