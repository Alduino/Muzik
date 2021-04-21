import {useToken} from "@chakra-ui/react";
import React, {FC} from "react";
import useThemeColours from "../../hooks/useThemeColours";

/**
 * Use the .custom-scroll class on scrollable elements to enable
 */
export const CustomScrollProvider: FC = props => {
    const colours = useThemeColours();
    const colour = useToken("colors", colours.backgroundL3);
    const background = useToken("colors", colours.backgroundL1);
    return (
        <>
            <style>{`.custom-scroll{--custom-scroll-colour:${colour};--custom-scroll-background:${background}`}</style>
            {props.children}
        </>
    );
};
