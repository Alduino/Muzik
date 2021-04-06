import {Box, Heading, VStack} from "@chakra-ui/react";
import React, {FC} from "react";
import useThemeColours from "../../hooks/useThemeColours";

export interface HeadedFloatProps {
    header: string;
}

export const HeadedFloat: FC<HeadedFloatProps> = props => {
    const colours = useThemeColours();

    return (
        <Box
            borderWidth={1}
            borderColor={colours.border}
            borderRadius="md"
            overflow="hidden"
            shadow="lg"
            color={colours.text}
        >
            <Heading
                size="md"
                p={4}
                shadow="md"
                background={colours.backgroundL2}
            >
                {props.header}
            </Heading>
            <VStack spacing={2} p={4} background={colours.backgroundL1}>
                {props.children}
            </VStack>
        </Box>
    );
};
