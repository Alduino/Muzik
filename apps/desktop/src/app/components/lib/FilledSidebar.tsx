import {chakra} from "@chakra-ui/react";
import React, {FC} from "react";
import {Sidebar} from "./Sidebar";

const FilledSidebarImpl: FC<{className?: string}> = props => {
    return <Sidebar className={props.className} />;
};
FilledSidebarImpl.displayName = "FilledSidebar";

export const FilledSidebar = chakra(FilledSidebarImpl);
