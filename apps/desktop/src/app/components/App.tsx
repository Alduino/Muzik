import {
    Box,
    Center,
    chakra,
    Circle,
    Flex,
    Grid,
    Text,
    useColorModeValue,
    useToken,
    VStack
} from "@chakra-ui/react";
import React, {FC} from "react";
import {PuffLoader} from "react-spinners";
import useThemeColours from "../hooks/useThemeColours";
import {GlobalRoute} from "../reducers/routing";
import {useAppSelector} from "../store-hooks";
import {AlbumListing} from "./AlbumListing";
import {QueueListing} from "./QueueListing";
import {Settings} from "./Settings";
import {SongListing} from "./SongListing";
import {ErrorLabel} from "./lib/ErrorLabel";
import {FilledSidebar} from "./lib/FilledSidebar";
import {MediaControls, SongDisplay} from "./lib/MediaControls";

const CornerClip = chakra((props: {className?: string}) => {
    const colours = useThemeColours();
    const radius = useToken("radii", "md");
    const bg = useToken("colors", colours.backgroundL1);

    return (
        <Box
            className={props.className}
            borderRadius={radius}
            boxShadow={`-${radius} -${radius} 0 0 ${bg}`}
            width={`calc(${radius} * 2)`}
            height={`calc(${radius} * 2)`}
            pointerEvents="none"
        />
    );
});

const PageContainer: FC = props => {
    const colours = useThemeColours();

    return (
        <Grid
            templateAreas={`"nowpl mctrl" "nav route"`}
            templateColumns="16rem minmax(0, 1fr)"
            templateRows="6rem minmax(0, 1fr)"
            width="100vw"
            height="100vh"
        >
            <Box
                as="main"
                bg={colours.backgroundL2}
                gridArea="route"
                width="100%"
                height="100%"
                overflow="auto"
                className="custom-scroll"
            >
                {props.children}
            </Box>
            <SongDisplay gridArea="nowpl" />
            <MediaControls gridArea="mctrl" />
            <FilledSidebar gridArea="nav" />
            <CornerClip gridArea="route" zIndex={10} />
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

    return (
        <Flex
            minHeight="100vh"
            direction="column"
            background={backgroundL0}
            color={text}
        >
            {isLoaded ? <LoadedApp /> : <LoadingApp />}
        </Flex>
    );
};
