import {useQueryClient} from "@tanstack/react-query";
import {getQueryKey} from "@trpc/react-query";
import {ReactElement} from "react";
import useEventHandler from "../../../hooks/useEventHandler.ts";
import {trpc} from "../../../utils/trpc.ts";
import {DirectoryAdder} from "./DirectoryAdder.tsx";
import {DirectoryItem} from "./DirectoryItem.tsx";

const EMPTY_ARRAY: never[] = [];

export function DirectorySelector(): ReactElement {
    const storeDirectoriesKey = getQueryKey(
        trpc.meta.config.getStoreDirectories,
        undefined,
        "query"
    );

    const queryClient = useQueryClient();

    const response = trpc.meta.config.getStoreDirectories.useQuery(undefined);

    const directories = response.data ?? EMPTY_ARRAY;

    const {mutate} = trpc.meta.config.setStoreDirectories.useMutation({
        async onMutate({directories: newDirectories}) {
            console.log("Setting", storeDirectoriesKey, newDirectories);
            await queryClient.cancelQueries(storeDirectoriesKey);
            queryClient.setQueryData(storeDirectoriesKey, newDirectories);
        }
    });

    const removeDirectory = useEventHandler((dir: string) => {
        mutate({
            directories: directories.filter(directory => directory !== dir)
        });
    });

    const addDirectory = useEventHandler(dir => {
        mutate({
            directories: [...directories, dir]
        });
    });

    return (
        <div>
            {directories?.map(directory => (
                <DirectoryItem
                    key={directory}
                    directory={directory}
                    onRemove={() => removeDirectory(directory)}
                />
            ))}
            <DirectoryAdder onAdd={addDirectory} />
        </div>
    );
}
