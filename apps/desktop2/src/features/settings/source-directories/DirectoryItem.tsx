import {mdiTrashCan} from "@mdi/js";
import {ReactElement} from "react";
import {Button} from "../../../components/button";
import {useTranslation} from "../../../hooks/useTranslation.ts";
import {itemContainerClass, itemPathClass} from "./styles.css.ts";

interface DirectoryItemProps {
    directory: string;

    onRemove(): void;
}

export function DirectoryItem({
    directory,
    onRemove
}: DirectoryItemProps): ReactElement {
    const t = useTranslation("settings");

    return (
        <div className={itemContainerClass}>
            <span className={itemPathClass}>{directory}</span>
            <Button
                icon={mdiTrashCan}
                label={t("source-directories-remove-label")}
                iconOnly
                onClick={onRemove}
            />
        </div>
    );
}
