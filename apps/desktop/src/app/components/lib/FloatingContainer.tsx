import {Box, chakra} from "@chakra-ui/react";
import React, {FC} from "react";
import useThemeColours from "../../hooks/useThemeColours";

const FloatingContainerInner: FC<{className?: string}> = ({
    children,
    className
}) => {
    const colours = useThemeColours();

    return (
        <Box
            borderRadius="md"
            shadow="lg"
            background={colours.backgroundL1}
            color={colours.text}
            width="container.sm"
            overflow="hidden"
            className={className}
        >
            {children}
        </Box>
    );
};

export const FloatingContainer = chakra(FloatingContainerInner);
