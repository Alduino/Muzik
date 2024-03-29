import {mdiCog, mdiDiscPlayer} from "@mdi/js";
import clsx from "clsx";
import {ReactElement} from "react";
import {useTranslation} from "../../hooks/useTranslation.ts";
import {Logo} from "./logo";
import {NavLink} from "./nav-link";
import {Section} from "./section";
import {containerClass} from "./styles.css.ts";

export interface NavigationProps {
    className?: string;
}

export function Navigation({className}: NavigationProps): ReactElement {
    const t = useTranslation("navigation");

    return (
        <div className={clsx(containerClass, className)}>
            <Logo />

            <Section title={t("lists-section-title")}>
                <NavLink
                    title={t("songs-link")}
                    path="/songs"
                    icon={mdiDiscPlayer}
                />
            </Section>

            <Section>
                <NavLink
                    title={t("settings-link")}
                    path="/settings"
                    icon={mdiCog}
                />
            </Section>
        </div>
    );
}
