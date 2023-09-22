import {
    Box,
    Center,
    Circle,
    Flex,
    Grid,
    Spinner,
    Text,
    useColorModeValue,
    VStack
} from "@chakra-ui/react";
import React, {FC} from "react";
import {PuffLoader} from "react-spinners";
import {Cinema} from "../features/cinema/Page";
import useThemeColours from "../hooks/useThemeColours";
import {GlobalRoute} from "../reducers/routing";
import useMediaBarConfiguration from "../rpc/useMediaBarConfiguration";
import {useAppSelector} from "../store-hooks";
import {
    DARK_THEME_CLASS,
    LIGHT_THEME_CLASS,
    SYSTEM_THEME_CLASS
} from "../utils/styling/colour-scheme.css";
import {AlbumListing} from "./AlbumListing";
import {QueueListing} from "./QueueListing";
import {Settings} from "./Settings";
import {SongListing} from "./SongListing";
import {ErrorLabel} from "./lib/ErrorLabel";
import {ErrorText} from "./lib/ErrorText";
import {FilledSidebar} from "./lib/FilledSidebar";
import {MediaControls, SongDisplay} from "./lib/MediaControls";

const PageContainer: FC = props => {
    const colours = useThemeColours();
    const {data: mediaBarConfig, error: mediaBarConfigError} =
        useMediaBarConfiguration();

    if (mediaBarConfigError) {
        return <ErrorText error={mediaBarConfigError} />;
    } else if (!mediaBarConfig) {
        return (
            <Center>
                <Spinner />
            </Center>
        );
    }

    const templateAreas =
        mediaBarConfig.position === "top"
            ? '"nowpl mctrl" "nav route"'
            : '"nav route" "nowpl mctrl"';
    const templateRows =
        mediaBarConfig.position === "top"
            ? "6rem minmax(0, 1fr)"
            : "minmax(0, 1fr) 6rem";
    const borderRadiusProp =
        mediaBarConfig.position === "top"
            ? {borderTopLeftRadius: "md"}
            : {borderBottomLeftRadius: "md"};

    return (
        <Grid
            templateAreas={templateAreas}
            templateColumns="16rem minmax(0, 1fr)"
            templateRows={templateRows}
            width="100vw"
            height="100vh"
        >
            <Box
                {...borderRadiusProp}
                as="main"
                bg={colours.backgroundL1}
                gridArea="route"
                width="100%"
                height="100%"
                overflow="auto"
                boxShadow="inner"
                className="custom-scroll"
            >
                {props.children}
            </Box>
            <SongDisplay gridArea="nowpl" />
            <MediaControls gridArea="mctrl" />
            <FilledSidebar gridArea="nav" />
        </Grid>
    );
};

const LoadedApp: FC = () => {
    const route = useAppSelector(state => state.routing.globalRoute);

    switch (route) {
        case GlobalRoute.albumListing:
            return (
                <PageContainer>
                    <AlbumListing />
                </PageContainer>
            );
        case GlobalRoute.songListing:
            return (
                <PageContainer>
                    <SongListing />
                </PageContainer>
            );
        case GlobalRoute.queueListing:
            return (
                <PageContainer>
                    <QueueListing />
                </PageContainer>
            );
        case GlobalRoute.settings:
            return (
                <PageContainer>
                    <Settings />
                </PageContainer>
            );
        case GlobalRoute.cinema:
            return (
                <PageContainer>
                    <Cinema />
                </PageContainer>
            );
        default:
            return (
                <PageContainer>
                    <ErrorLabel message={"NOT_FOUND:" + GlobalRoute[route]} />
                </PageContainer>
            );
    }
};

const LoadingApp: FC = () => {
    const description = useAppSelector(
        state => state.loadState.currentDescription
    );
    const progress = useAppSelector(state => state.loadState.currentProgress);

    const textColour = useColorModeValue("gray.900", "white");
    const bgColour = useColorModeValue("gray.50", "gray.800");

    return (
        <Center flex={1} color={textColour}>
            <VStack spacing={6}>
                <Circle p={4} background={bgColour} shadow="lg">
                    <PuffLoader />
                </Circle>
                <Text fontSize="sm" opacity={0.4}>
                    {description}
                    {progress ? ` (${progress.toFixed(0)}%)` : null}
                </Text>
            </VStack>
        </Center>
    );
};

export const App: FC = () => {
    const isLoaded = useAppSelector(state => state.loadState.value);
    const {backgroundL0, text} = useThemeColours();
    const themeClass = useColorModeValue(LIGHT_THEME_CLASS, DARK_THEME_CLASS);

    return (
        <Flex
            className={themeClass}
            minHeight="100vh"
            direction="column"
            background={backgroundL0}
            color={text}
        >
            {isLoaded ? <LoadedApp /> : <LoadingApp />}
        </Flex>
    );
};
