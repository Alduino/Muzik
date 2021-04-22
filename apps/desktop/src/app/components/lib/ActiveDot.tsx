import {Box, Circle} from "@chakra-ui/react";
import React, {FC} from "react";
import useThemeColours from "../../hooks/useThemeColours";

export const ActiveDot: FC<{isActive?: boolean}> = props => {
    const colour = useThemeColours();

    return (
        <Circle
            opacity={props.isActive === false ? 0 : 1}
            backgroundColor={colour.active}
            size={1}
        />
    );
};

export const ActiveDotContainer: FC<{
    isActive: boolean;
    gap?: number;
}> = props => (
    <Box position="relative">
        <Box>{props.children}</Box>
        {props.isActive && (
            <Box
                position="absolute"
                bottom={0 - props.gap - 1}
                left="50%"
                transform="translateX(-50%)"
            >
                <ActiveDot />
            </Box>
        )}
    </Box>
);
