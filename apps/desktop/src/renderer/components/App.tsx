import React, {FC} from "react";
import {useSelector} from "react-redux";
import {Center, Circle, Flex, useColorModeValue} from "@chakra-ui/react";
import {PuffLoader} from "react-spinners";
import {RootState} from "../reducers/root";

const LoadedApp: FC = () => <p>Loaded</p>;

const LoadingApp: FC = () => {
    const textColour = useColorModeValue("gray.900", "white");
    const bgColour = useColorModeValue("gray.50", "gray.800");

    return (
        <Center flex={1}>
            <Circle p={4} background={bgColour} color={textColour} shadow="lg">
                <PuffLoader />
            </Circle>
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
