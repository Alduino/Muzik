import {ReactElement, useEffect} from "react";
import {useRouteError} from "react-router-dom";
import {Button} from "../../components/button";
import {useTranslation} from "../../hooks/useTranslation.ts";
import {AppLayout} from "../layout";
import {containerClass, subtitleClass, titleClass} from "./styles.css.ts";

export function ErrorBoundary(): ReactElement {
    const t = useTranslation("error-boundary");
    const error = useRouteError();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <AppLayout>
            <div className={containerClass}>
                <h2 className={titleClass}>{t("error-boundary-title")}</h2>
                <p className={subtitleClass}>{t("error-boundary-subtitle")}</p>
                <Button href="/" label={t("error-boundary-go-home-link")} />
            </div>
        </AppLayout>
    );
}
