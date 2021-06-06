import {
    Box,
    chakra,
    Divider,
    Heading,
    HStack,
    Skeleton,
    Text,
    useBoolean
} from "@chakra-ui/react";
import React, {
    CSSProperties,
    FC,
    MutableRefObject,
    useEffect,
    useRef
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import {FixedSizeList} from "react-window";
import defaultAlbumArt from "../assets/default-album-art.svg";
import useThemeColours from "../hooks/useThemeColours";
import {selectAlbum} from "../reducers/albumListingRoute";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    playAlbumAfterNext,
    playAlbumNext,
    queueAlbum
} from "../reducers/queue";
import {useAlbumIds, useArtist, useExtendedAlbum, useTrack} from "../rpc";
import useAlbumTrackIds from "../rpc/useAlbumTrackIds";
import {useAppDispatch, useAppSelector} from "../store-hooks";
import {VisualiserIcon} from "./lib/AudioController";
import {ContextMenu, MenuItem, useContextMenu} from "./lib/ContextMenu";
import {ErrorText} from "./lib/ErrorText";
import {FadeOverflow} from "./lib/FadeOverflow";
import {PlayButtonAlbumArt} from "./lib/PlayButtonAlbumArt";
import {SongList} from "./lib/SongList";
import {TransText} from "./lib/TransText";

const ContainerImpl: FC<{className?: string}> = props => (
    <Box className={props.className} height="fill">
        {props.children}
    </Box>
);
ContainerImpl.displayName = "Container";

const Container = chakra(ContainerImpl);

interface AlbumProps {
    albumId: number;
    isPlaying: boolean;
    style?: CSSProperties;
}

const Album: FC<AlbumProps> = ({albumId, isPlaying, ...props}) => {
    const dispatch = useAppDispatch();
    const {onContextMenu, props: contextMenuProps} = useContextMenu();
    const colours = useThemeColours();

    const selectedAlbum = useAppSelector(
        v => v.albumListingRoute.selectedAlbum
    );
    const isSelected = selectedAlbum === albumId;

    const {data: album, error: albumError} = useExtendedAlbum(albumId);
    const {data: artist, error: artistError} = useArtist(album?.artistId);

    const [isHovered, setHovered] = useBoolean();

    const artPath = album ? album.art?.url ?? defaultAlbumArt : undefined;
    const artDefaultBg = album?.art?.avgColour;

    const handleAlbumSelect = () => {
        dispatch(selectAlbum(album.id));
    };

    const handleAlbumPlay = () => {
        dispatch(cancelPlaying());
        dispatch(clearQueue());
        dispatch(queueAlbum(album.id)).then(() => dispatch(beginQueue()));
    };

    const handlePlayNext = () => {
        dispatch(playAlbumNext(album.id));
    };

    const handleAddToQueue = () => {
        dispatch(playAlbumAfterNext(album.id));
    };

    if (albumError) {
        return <ErrorText error={albumError} />;
    } else if (artistError) {
        return <ErrorText error={artistError} />;
    }

    return (
        <HStack
            pr={4}
            cursor="pointer"
            spacing={3}
            {...props}
            onClick={handleAlbumSelect}
            onMouseEnter={setHovered.on}
            onMouseLeave={setHovered.off}
            onContextMenu={onContextMenu}
        >
            <ContextMenu {...contextMenuProps}>
                <MenuItem onClick={handleAddToQueue}>
                    <TransText k="queueControls.addToQueue" />
                </MenuItem>
                <MenuItem onClick={handlePlayNext}>
                    <TransText k="queueControls.playNext" />
                </MenuItem>
            </ContextMenu>

            <PlayButtonAlbumArt
                isHovered={isHovered}
                isCurrent={isPlaying}
                artPath={artPath}
                artSize={24}
                buttonSize="lg"
                unloadedBackground={artDefaultBg}
                onPlay={handleAlbumPlay}
            />

            <Box
                bg={colours.active}
                width={1}
                height={4}
                borderRadius="sm"
                opacity={isSelected ? 1 : 0}
            />

            <FadeOverflow flex={1}>
                <HStack>
                    {album ? (
                        <Heading
                            size="md"
                            textDecoration={isHovered && "underline"}
                            whiteSpace="nowrap"
                        >
                            {album.name}
                        </Heading>
                    ) : (
                        <Skeleton size="md" />
                    )}
                    {isPlaying && (
                        <VisualiserIcon bands={3} width={4} height={4} />
                    )}
                </HStack>
                <HStack divider={<Text mx={2}>·</Text>}>
                    {artist ? (
                        <Text whiteSpace="nowrap">by {artist.name}</Text>
                    ) : (
                        <Skeleton />
                    )}
                </HStack>
            </FadeOverflow>
        </HStack>
    );
};

interface AlbumListProps {
    albums: number[];
    playingAlbum: number | null;
    listRef?: MutableRefObject<FixedSizeList>;
}

const AlbumList: FC<AlbumListProps> = ({albums, playingAlbum, ...props}) => (
    <AutoSizer>
        {size => (
            <FixedSizeList
                itemSize={100}
                itemCount={albums.length}
                itemData={albums.map(item => ({
                    albumId: item,
                    playing: item === playingAlbum
                }))}
                width={size.width}
                height={size.height}
                className="custom-scroll"
                ref={props.listRef}
            >
                {({data, index, style}) => {
                    const {albumId, playing} = data[index] as {
                        albumId: number;
                        playing: boolean;
                    };

                    return (
                        <Album
                            albumId={albumId}
                            isPlaying={playing}
                            style={style}
                        />
                    );
                }}
            </FixedSizeList>
        )}
    </AutoSizer>
);

export const AlbumListing: FC = () => {
    const colours = useThemeColours();
    const selectedAlbum = useAppSelector(
        v => v.albumListingRoute.selectedAlbum
    );
    const playingSong = useAppSelector(v => v.queue.nowPlaying);

    const albumListRef = useRef<FixedSizeList>();

    const {data: albums, error: albumsError} = useAlbumIds();
    const {data: playingTrack, error: playingTrackError} = useTrack(
        playingSong
    );
    const {
        data: selectedAlbumTracks,
        error: selectedAlbumTracksError
    } = useAlbumTrackIds(selectedAlbum);

    const playingAlbumId = playingTrack?.albumId;

    useEffect(() => {
        const {current} = albumListRef;
        if (!current) return;

        const {albumIds} = albums || {};
        if (!albumIds) return;

        const index = albumIds.findIndex(v => v === selectedAlbum);
        current.scrollToItem(index, "smart");
    }, [albumListRef.current, albums, selectedAlbum]);

    if (albumsError) {
        return <ErrorText error={albumsError} />;
    } else if (playingTrackError) {
        return <ErrorText error={playingTrackError} />;
    } else if (selectedAlbumTracksError) {
        return <ErrorText error={selectedAlbumTracksError} />;
    }

    return (
        <HStack
            justify="start"
            align="stretch"
            spacing={0}
            background={colours.backgroundL2}
            height="100%"
        >
            <Container flexGrow={1}>
                {!albums ? (
                    Array.from({length: 4}, (_, i) => (
                        <Skeleton key={i} width="full" mx={4} mt={4} />
                    ))
                ) : (
                    <AlbumList
                        albums={albums.albumIds}
                        playingAlbum={playingAlbumId}
                        listRef={albumListRef}
                    />
                )}
            </Container>

            {!selectedAlbum && <Divider orientation="vertical" />}

            {selectedAlbumTracks?.trackIds.length > 0 && (
                <Container width="28rem">
                    <SongList songIds={selectedAlbumTracks.trackIds} />
                </Container>
            )}
        </HStack>
    );
};
