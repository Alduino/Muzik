import {mdiFolder, mdiPlus} from "@mdi/js";
import {ChangeEvent, ReactElement, useState} from "react";
import {Button} from "../../../components/button";
import useEventHandler from "../../../hooks/useEventHandler.ts";
import {useTranslation} from "../../../hooks/useTranslation.ts";
import {trpc} from "../../../utils/trpc.ts";
import {adderContainerClass, textboxClass} from "./styles.css.ts";

export interface DirectoryAdder {
    onAdd(directory: string): void;
}

export function DirectoryAdder({onAdd}: DirectoryAdder): ReactElement {
    const directoryChooser = trpc.meta.showOpenDialog.useMutation();

    const [directory, setDirectory] = useState("");

    const chooseDirectory = useEventHandler(async () => {
        const result = await directoryChooser.mutateAsync({
            properties: ["openDirectory"]
        });

        const path = result.filePaths[0];
        if (!path) return;

        setDirectory(path);
    });

    const handleDirectoryInputChanged = useEventHandler(
        (ev: ChangeEvent<HTMLInputElement>) => {
            setDirectory(ev.target.value);
        }
    );

    const handleAdd = useEventHandler(() => {
        onAdd(directory);
        setDirectory("");
    });

    const t = useTranslation("settings");

    return (
        <div className={adderContainerClass}>
            <input
                className={textboxClass}
                type="text"
                spellCheck={false}
                value={directory}
                onChange={handleDirectoryInputChanged}
            />
            <Button
                icon={mdiFolder}
                label={t("source-directories-select-label")}
                onClick={chooseDirectory}
                iconOnly
            />
            <Button
                icon={mdiPlus}
                label={t("source-directories-add-label")}
                onClick={handleAdd}
                iconOnly
            />
        </div>
    );
}
