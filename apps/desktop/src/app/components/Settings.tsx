import {
    Box,
    Button,
    Center,
    Divider,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Grid,
    Heading,
    HStack,
    Icon,
    IconButton,
    RadioGroup,
    Radio,
    Spinner,
    Stack,
    Switch,
    Text
} from "@chakra-ui/react";
import React, {
    CSSProperties,
    PropsWithChildren,
    ReactElement,
    useCallback
} from "react";
import {useTranslation} from "react-i18next";
import {AiFillFolderAdd} from "react-icons/ai";
import {MdDelete} from "react-icons/md";
import selectDirectory from "../../lib/rpc/select-directory/app";
import setDiscordRichPresenceConfiguration from "../../lib/rpc/set-discord-rich-presence-configuration/app";
import setMediaBarConfiguration from "../../lib/rpc/set-media-bar-configuration/app";
import setSourceDirectories from "../../lib/rpc/set-source-directories/app";
import useDiscordRichPresenceConfiguration from "../rpc/useDiscordRichPresenceConfiguration";
import useMediaBarConfiguration from "../rpc/useMediaBarConfiguration";
import useSourceDirectories from "../rpc/useSourceDirectories";
import {ErrorText} from "./lib/ErrorText";
import {TransText} from "./lib/TransText";

interface SettingsControlChildProps {
    style: CSSProperties;
}

interface SettingsControlProps {
    label: string;
    help: string;
    id?: string;
    isDisabled?: boolean;

    children(props: SettingsControlChildProps): ReactElement;
}

const SettingsControl = ({
    label,
    help,
    id,
    isDisabled,
    children: Children
}: SettingsControlProps): ReactElement => {
    const {t} = useTranslation("app");

    return (
        <Grid
            as={FormControl}
            id={id}
            display="grid"
            templateRows="auto auto"
            templateColumns="auto 1fr"
            alignItems="center"
            gap={2}
            isDisabled={isDisabled}
        >
            <FormLabel gridRow="1" gridColumn="1" m={0}>
                {t(label)}
            </FormLabel>
            <Children style={{gridColumn: 2, gridRow: 1}} />
            <FormHelperText m={0} gridRow="2" gridColumn="1/3">
                {t(help)}
            </FormHelperText>
        </Grid>
    );
};

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

const DiscordRichPresenceConfiguration = (): ReactElement => {
    const {
        data: configuration,
        error,
        mutate
    } = useDiscordRichPresenceConfiguration();

    const handleUpdate = useCallback(
        async (newConfig: typeof configuration) => {
            await setDiscordRichPresenceConfiguration(newConfig);
            mutate(newConfig);
        },
        [mutate]
    );

    const handleEnabledChanged = useCallback(
        (isEnabled: boolean) => {
            return handleUpdate({...configuration, isEnabled});
        },
        [configuration, handleUpdate]
    );

    const handleDisplayWhenPausedChanged = useCallback(
        (displayWhenPaused: boolean) => {
            return handleUpdate({...configuration, displayWhenPaused});
        },
        [configuration, handleUpdate]
    );

    if (error) {
        return <ErrorText error={error} />;
    } else if (!configuration) {
        return (
            <Center>
                <Spinner />
            </Center>
        );
    }

    return (
        <Stack spacing={4}>
            <SettingsControl
                label="settingsRoute.discordIntegration.enable"
                help="settingsRoute.discordIntegration.enableInfo"
                id="discord-rp"
            >
                {({style}) => (
                    <Switch
                        id="discord-rp"
                        isChecked={configuration.isEnabled}
                        onChange={e =>
                            handleEnabledChanged(e.currentTarget.checked)
                        }
                        style={style}
                    />
                )}
            </SettingsControl>
            <SettingsControl
                label="settingsRoute.discordIntegration.displayWhenPaused"
                help="settingsRoute.discordIntegration.displayWhenPausedInfo"
                id="discord-rp-paused"
                isDisabled={!configuration.isEnabled}
            >
                {({style}) => (
                    <Switch
                        id="discord-rp-paused"
                        isChecked={configuration.displayWhenPaused}
                        isDisabled={!configuration.isEnabled}
                        onChange={e =>
                            handleDisplayWhenPausedChanged(
                                e.currentTarget.checked
                            )
                        }
                        style={style}
                    />
                )}
            </SettingsControl>
        </Stack>
    );
};

const MediaBarConfiguration = (): ReactElement => {
    const {t} = useTranslation("app");

    const {data: configuration, error, mutate} = useMediaBarConfiguration();

    const handleUpdate = useCallback(
        async (newConfig: typeof configuration) => {
            await setMediaBarConfiguration(newConfig);
            mutate(newConfig);
        },
        [mutate]
    );

    const handlePositionChanged = useCallback(
        (position: "top" | "bottom") => {
            return handleUpdate({...configuration, position});
        },
        [configuration, handleUpdate]
    );

    if (error) {
        return <ErrorText error={error} />;
    } else if (!configuration) {
        return (
            <Center>
                <Spinner />
            </Center>
        );
    }

    return (
        <Stack spacing={4}>
            <SettingsControl
                label="settingsRoute.mediaBar.position"
                help="settingsRoute.mediaBar.positionInfo"
            >
                {props => (
                    <RadioGroup
                        {...props}
                        onChange={handlePositionChanged}
                        value={configuration.position}
                    >
                        <Stack direction="row">
                            <Radio value="top">
                                {t("settingsRoute.mediaBar.positionTop")}
                            </Radio>
                            <Radio value="bottom">
                                {t("settingsRoute.mediaBar.positionBottom")}
                            </Radio>
                        </Stack>
                    </RadioGroup>
                )}
            </SettingsControl>
        </Stack>
    );
};

const SettingsSection = ({
    headingKey,
    children
}: PropsWithChildren<{headingKey: string}>): ReactElement => (
    <Flex display="inline-flex" direction="column" maxW="24rem" mb={4}>
        <Heading as={TransText} size="sm" mb={2} k={headingKey} />
        {children}
        <Divider mt={4} />
    </Flex>
);

export const Settings = (): ReactElement => {
    return (
        <Box p={4} height="100%" sx={{columnWidth: "24rem"}}>
            <SettingsSection headingKey="settingsRoute.musicDirectories">
                <DirectorySelector />
            </SettingsSection>
            <SettingsSection headingKey="settingsRoute.discordIntegrationLabel">
                <DiscordRichPresenceConfiguration />
            </SettingsSection>
            <SettingsSection headingKey="settingsRoute.mediaBarLabel">
                <MediaBarConfiguration />
            </SettingsSection>
        </Box>
    );
};
