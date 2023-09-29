import {ReactElement} from "react";
import {useTranslation} from "../../hooks/useTranslation.ts";
import {Importer} from "./importer";
import {SettingsSection} from "./section";
import {DirectorySelector} from "./source-directories/DirectorySelector.tsx";
import {containerClass} from "./styles.css.ts";

export function Component(): ReactElement {
    const t = useTranslation("settings");

    return (
        <div className={containerClass}>
            <SettingsSection title={t("source-directories-section-title")}>
                <DirectorySelector />
                <Importer />
            </SettingsSection>
        </div>
    );
}
