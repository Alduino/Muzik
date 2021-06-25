import {Box, chakra, IconButton} from "@chakra-ui/react";
import React, {ReactElement, useCallback} from "react";
import {BiChevronDown, BiChevronUp} from "react-icons/bi";
import getAllTrackIds from "../../../lib/rpc/get-all-track-ids/app";
import useAlbumArt from "../../hooks/useAlbumArt";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    queueSongs
} from "../../reducers/queue";
import {
    GlobalRoute,
    setAlbumArtSize,
    setGlobalRoute
} from "../../reducers/routing";
import useMediaBarConfiguration from "../../rpc/useMediaBarConfiguration";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {AlbumArt} from "./AlbumArt";
import {VisualiserIcon} from "./AudioController";
import {Sidebar, SidebarGroup, SidebarItem} from "./Sidebar";
import {TransText} from "./TransText";

export interface FilledSidebarProps {
    className?: string;
}

function useRouteSetter(route: GlobalRoute) {
    const dispatch = useAppDispatch();

    return useCallback(() => {
        dispatch(setGlobalRoute(route));
    }, [dispatch, route]);
}

const BigAlbumArt = (): ReactElement => {
    const dispatch = useAppDispatch();

    const albumArtIsLarge = useAppSelector(
        state => state.routing.albumArtIsLarge
    );
    const currentSongId = useAppSelector(state => state.queue.nowPlaying);

    const {data: mediaBarConfig} = useMediaBarConfiguration();

    const albumArtProps = useAlbumArt(currentSongId);

    const handleAlbumArtContract = useCallback(() => {
        dispatch(setAlbumArtSize(false));
    }, [dispatch]);

    return (
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
                top={
                    albumArtIsLarge || mediaBarConfig?.position === "bottom"
                        ? 0
                        : -64
                }
            >
                <IconButton
                    aria-label="Expand"
                    as={
                        mediaBarConfig?.position === "top"
                            ? BiChevronUp
                            : BiChevronDown
                    }
                    left={2}
                    bottom={
                        mediaBarConfig?.position === "bottom" ? 2 : undefined
                    }
                    top={mediaBarConfig?.position === "top" ? 2 : undefined}
                    position="absolute"
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
    );
};

export const FilledSidebar = chakra((props: FilledSidebarProps) => {
    const dispatch = useAppDispatch();
    const currentRoute = useAppSelector(state => state.routing.globalRoute);

    const {data: mediaBarConfig} = useMediaBarConfiguration();

    const setAlbumListing = useRouteSetter(GlobalRoute.albumListing);
    const setSongListing = useRouteSetter(GlobalRoute.songListing);
    const setQueueListing = useRouteSetter(GlobalRoute.queueListing);
    const setSettings = useRouteSetter(GlobalRoute.settings);

    const handlePlayAll = useCallback(async () => {
        const allTrackIds = await getAllTrackIds();
        dispatch(cancelPlaying());
        dispatch(clearQueue());
        dispatch(queueSongs(allTrackIds.trackIds));
        dispatch(beginQueue());
    }, [dispatch]);

    return (
        <Sidebar className={props.className}>
            {mediaBarConfig?.position === "top" && <BigAlbumArt />}
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
                <SidebarItem
                    isSelected={currentRoute === GlobalRoute.settings}
                    onClick={setSettings}
                >
                    <TransText k="routes.settings" />
                </SidebarItem>
            </SidebarGroup>
            {mediaBarConfig?.position === "bottom" && (
                <>
                    <Box flexGrow={1} />
                    <BigAlbumArt />
                </>
            )}
        </Sidebar>
    );
});
