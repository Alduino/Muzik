import {VStack} from "@chakra-ui/react";
import React, {FC} from "react";
import useThemeColours from "../../hooks/useThemeColours";

const SidebarImpl: FC<{className?: string}> = props => {
    const colours = useThemeColours();

    return (
        <VStack
            backgroundColor={colours.backgroundL1}
            className={props.className}
        ></VStack>
    );
};
SidebarImpl.displayName = "Sidebar";

export const Sidebar = SidebarImpl;
