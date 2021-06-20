import {
    Button,
    Center,
    Heading,
    HStack,
    Icon,
    IconButton,
    Spinner,
    Stack,
    Text
} from "@chakra-ui/react";
import React, {ReactElement, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {AiFillFolderAdd} from "react-icons/ai";
import {MdDelete} from "react-icons/md";
import selectDirectory from "../../lib/rpc/select-directory/app";
import setSourceDirectories from "../../lib/rpc/set-source-directories/app";
import useSourceDirectories from "../rpc/useSourceDirectories";
import {ErrorText} from "./lib/ErrorText";
import {TransText} from "./lib/TransText";

interface DirectorySelectorListProps {
    directories: string[];
    onDelete(index: number): void;
    onAdd(): void;
}

const DirectorySelectorList = ({
    directories,
    onDelete,
    onAdd
}: DirectorySelectorListProps): ReactElement => {
    const {t} = useTranslation("app");

    return (
        <Stack>
            {directories.map((directory, i) => (
                <HStack
                    key={i}
                    gap={4}
                    css={{"&:hover > button:first-of-type": {opacity: 1}}}
                >
                    <IconButton
                        aria-label={t("settingsRoute.removeDirectory")}
                        icon={<Icon as={MdDelete} />}
                        size="sm"
                        colorScheme="red"
                        opacity={0}
                        onClick={() => onDelete(i)}
                    />
                    <Text>{directory}</Text>
                </HStack>
            ))}
            <Button
                aria-label={t("settingsRoute.selectDirectory")}
                size="sm"
                onClick={onAdd}
            >
                <HStack gap={4}>
                    <Icon as={AiFillFolderAdd} />
                    <TransText k="settingsRoute.selectDirectory" />
                </HStack>
            </Button>
        </Stack>
    );
};

const DirectorySelector = (): ReactElement => {
    const {data: sourceDirectories, error, mutate} = useSourceDirectories();

    const handleAdd = useCallback(async () => {
        const {path} = await selectDirectory();
        if (!path) return;
        const paths = [...sourceDirectories, path];
        mutate(paths);
        await setSourceDirectories({paths});
    }, [sourceDirectories, mutate]);

    const handleDelete = useCallback(
        async (idx: number) => {
            const paths = [
                ...sourceDirectories.slice(0, idx),
                ...sourceDirectories.slice(idx + 1, sourceDirectories.length)
            ];
            mutate(paths);
            await setSourceDirectories({paths});
        },
        [sourceDirectories, mutate]
    );

    if (error) {
        return <ErrorText error={error} />;
    } else if (!sourceDirectories) {
        return (
            <Center>
                <Spinner />
            </Center>
        );
    }

    return (
        <DirectorySelectorList
            directories={sourceDirectories}
            onAdd={handleAdd}
            onDelete={handleDelete}
        />
    );
};

export const Settings = (): ReactElement => {
    //const invoker = useAsyncCallback(invokeMusicPathSelector);

    return (
        <Stack p={4} w="24rem">
            <Heading
                size="sm"
                as={TransText}
                k="settingsRoute.musicDirectories"
            />

            <DirectorySelector />
        </Stack>
    );
};
