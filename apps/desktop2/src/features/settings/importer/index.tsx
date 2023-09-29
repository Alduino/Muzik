import {ReactElement, useState} from "react";
import {ImportProgress} from "../../../../electron/main/router/meta/import.ts";
import {Button} from "../../../components/button";
import {useTranslation} from "../../../hooks/useTranslation.ts";
import {trpc} from "../../../utils/trpc.ts";
import {InputWrapper} from "../input-wrapper";
import {containerClass} from "./styles.css.ts";

export function Importer(): ReactElement {
    const t = useTranslation("settings");

    const [importProgress, setImportProgress] = useState<ImportProgress | null>(
        null
    );

    trpc.meta.getImportProgress.useSubscription(undefined, {
        onData(progress) {
            setImportProgress(progress);
        }
    });

    const startImport = trpc.meta.import.useMutation();

    return (
        <div className={containerClass}>
            <InputWrapper description={t("importer-warning")}>
                <Button
                    fullWidth
                    label={t("start-import")}
                    disabled={!!importProgress}
                    onClick={() => startImport.mutate()}
                />
            </InputWrapper>

            {importProgress && (
                <dl>
                    <dt>{t("importer-progress-tracks-discovered")}</dt>
                    <dd>{importProgress.musicDiscovered}</dd>
                </dl>
            )}
        </div>
    );
}
