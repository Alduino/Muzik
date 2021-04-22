import {chakra} from "@chakra-ui/react";
import React, {useCallback} from "react";
import {Sidebar, SidebarGroup, SidebarItem} from "./Sidebar";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {TransText} from "./TransText";
import {GlobalRoute, setGlobalRoute} from "../../reducers/routing";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_ALL_SONG_IDS} from "../../../lib/ipc-constants";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    queueSongs
} from "../../reducers/queue";
import {VisualiserIcon} from "./AudioController";

export interface FilledSidebarProps {
    className?: string;
}

function useRouteSetter(route: GlobalRoute) {
    const dispatch = useAppDispatch();

    return useCallback(() => {
        dispatch(setGlobalRoute(route));
    }, [dispatch, route]);
}

export const FilledSidebar = chakra((props: FilledSidebarProps) => {
    const dispatch = useAppDispatch();
    const currentRoute = useAppSelector(state => state.routing.globalRoute);
    const setAlbumListing = useRouteSetter(GlobalRoute.albumListing);
    const setSongListing = useRouteSetter(GlobalRoute.songListing);

    const handlePlayAll = useCallback(async () => {
        const allSongIds = await invoke(EVENT_GET_ALL_SONG_IDS);
        dispatch(cancelPlaying());
        dispatch(clearQueue());
        dispatch(queueSongs(allSongIds.songIds));
        dispatch(beginQueue());
    }, [dispatch]);

    return (
        <Sidebar className={props.className}>
            <SidebarItem onClick={handlePlayAll}>
                <TransText k="queueControls.playAll" />
                <VisualiserIcon bands={3} width={4} height={4} />
            </SidebarItem>
            <SidebarGroup titleKey="sidebarGroups.routes">
                <SidebarItem
                    isSelected={currentRoute === GlobalRoute.albumListing}
                    onClick={setAlbumListing}
                >
                    <TransText k="routes.albums" />
                </SidebarItem>
                <SidebarItem
                    isSelected={currentRoute === GlobalRoute.songListing}
                    onClick={setSongListing}
                >
                    <TransText k="routes.songs" />
                </SidebarItem>
            </SidebarGroup>
        </Sidebar>
    );
});
