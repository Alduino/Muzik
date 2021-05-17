import {Box, chakra, IconButton} from "@chakra-ui/react";
import React, {useCallback} from "react";
import {Sidebar, SidebarGroup, SidebarItem} from "./Sidebar";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {TransText} from "./TransText";
import {
    GlobalRoute,
    setAlbumArtSize,
    setGlobalRoute
} from "../../reducers/routing";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_ALL_TRACKS} from "../../../lib/ipc-constants";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    queueSongs
} from "../../reducers/queue";
import {VisualiserIcon} from "./AudioController";
import useAlbumArt from "../../hooks/useAlbumArt";
import {AlbumArt} from "./AlbumArt";
import {BiChevronUp} from "react-icons/bi";

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

    const albumArtIsLarge = useAppSelector(
        state => state.routing.albumArtIsLarge
    );

    const currentSongId = useAppSelector(state => state.queue.nowPlaying);

    const setAlbumListing = useRouteSetter(GlobalRoute.albumListing);
    const setSongListing = useRouteSetter(GlobalRoute.songListing);
    const setQueueListing = useRouteSetter(GlobalRoute.queueListing);

    const albumArtProps = useAlbumArt(currentSongId);

    const handlePlayAll = useCallback(async () => {
        const allSongIds = await invoke(EVENT_GET_ALL_TRACKS);
        dispatch(cancelPlaying());
        dispatch(clearQueue());
        dispatch(queueSongs(allSongIds.tracks.map(track => track.id)));
        dispatch(beginQueue());
    }, [dispatch]);

    const handleAlbumArtContract = useCallback(() => {
        dispatch(setAlbumArtSize(false));
    }, [dispatch]);

    return (
        <Sidebar className={props.className}>
            <Box
                overflow="hidden"
                height={albumArtIsLarge ? 64 : 0}
                opacity={albumArtIsLarge ? 1 : 0}
                transition=".4s"
                mb={4}
            >
                <AlbumArt
                    {...albumArtProps}
                    size={64}
                    borderRadius={0}
                    transition=".4s"
                    position="relative"
                    top={albumArtIsLarge ? 0 : -64}
                >
                    <IconButton
                        aria-label="Expand"
                        as={BiChevronUp}
                        mt={2}
                        ml={2}
                        size="sm"
                        bg="black"
                        color="white"
                        isRound={true}
                        opacity={0}
                        cursor="pointer"
                        _groupHover={{"&:not(:hover)": {opacity: 0.4}}}
                        _hover={{opacity: 0.6}}
                        _active={{background: "black", opacity: 1}}
                        onClick={handleAlbumArtContract}
                    />
                </AlbumArt>
            </Box>
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
                <SidebarItem
                    isSelected={currentRoute === GlobalRoute.queueListing}
                    onClick={setQueueListing}
                >
                    <TransText k="routes.queue" />
                </SidebarItem>
            </SidebarGroup>
        </Sidebar>
    );
});
