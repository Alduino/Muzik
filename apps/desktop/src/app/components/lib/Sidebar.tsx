import {chakra, Divider, Heading, HStack, VStack} from "@chakra-ui/react";
import React, {ReactNode} from "react";
import useThemeColours from "../../hooks/useThemeColours";
import {ActiveDot} from "./ActiveDot";
import {TransText} from "./TransText";

export interface SidebarProps {
    className?: string;
    children: ReactNode;
}

export const Sidebar = chakra((props: SidebarProps) => {
    const colours = useThemeColours();

    return (
        <VStack
            spacing={0}
            align="stretch"
            backgroundColor={colours.backgroundL0}
            className={props.className}
        >
            {props.children}
        </VStack>
    );
});
Sidebar.displayName = "Sidebar";

export interface SidebarGroupProps {
    className?: string;
    children: ReactNode;
    titleKey: string;
}

export const SidebarGroup = chakra((props: SidebarGroupProps) => (
    <>
        <Heading size="sm" pt={8} pb={2} px={4}>
            <TransText k={props.titleKey} />
        </Heading>
        {props.children}
        <Divider orientation="horizontal" />
    </>
));
SidebarGroup.displayName = "SidebarGroup";

export interface SidebarItemProps {
    isSelected?: boolean;
    className?: string;
    children: ReactNode;
    onClick?(): void;
}

export const SidebarItem = chakra((props: SidebarItemProps) => {
    const colours = useThemeColours();

    return (
        <HStack
            cursor="pointer"
            px={4}
            py={2}
            _hover={{background: colours.translucentHoverBg}}
            _active={{background: colours.translucentActiveBg}}
            color={colours.text}
            onClick={props.onClick}
        >
            <ActiveDot isActive={props.isSelected || false} />
            {props.children}
        </HStack>
    );
});
SidebarItem.displayName = "SidebarItem";
