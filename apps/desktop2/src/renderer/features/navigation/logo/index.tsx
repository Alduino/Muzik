import {ReactElement} from "react";
import {useTranslation} from "../../../hooks/useTranslation.ts";
import {containerClass, imgClass, titleClass} from "./styles.css.ts";

export function Logo(): ReactElement {
    const t = useTranslation("navigation");

    const logoPath = new URL("../../../assets/logo.svg", import.meta.url);

    return (
        <div className={containerClass}>
            <img
                className={imgClass}
                src={logoPath.toString()}
                alt={t("logo-alt")}
            />
            <h1 className={titleClass}>{t("app-name")}</h1>
        </div>
    );
}
