import React, {FC} from "react";
import {useSelector} from "react-redux";
import {
    Center,
    Circle,
    Flex,
    Text,
    useColorModeValue,
    VStack
} from "@chakra-ui/react";
import {PuffLoader} from "react-spinners";
import {RootState} from "../reducers/root";
import {GlobalRoute} from "../reducers/routing";
import {MusicStorePicker} from "./MusicStorePicker";
import {NotFound} from "./NotFound";

const LoadedApp: FC = () => {
    const route = useSelector<RootState, GlobalRoute>(
        state => state.routing.globalRoute
    );

    switch (route) {
        case GlobalRoute.musicStorePicker:
            return <MusicStorePicker />;
        default:
            return <NotFound route={GlobalRoute[route]} />;
    }
};

const LoadingApp: FC = () => {
    const description = useSelector<RootState, string>(
        state => state.loadState.currentDescription
    );

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
                </Text>
            </VStack>
        </Center>
    );
};

export const App: FC = () => {
    const isLoaded = useSelector<RootState>(state => state.loadState.value);

    return (
        <Flex minHeight="100vh" direction="column">
            {isLoaded ? <LoadedApp /> : <LoadingApp />}
        </Flex>
    );
};
