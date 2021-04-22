import type {Album as AlbumType} from "@muzik/database";
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
    useMemo,
    useRef,
    useState
} from "react";
import {useAsync} from "react-async-hook";
import {FixedSizeList} from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import {invoke} from "../../lib/ipc/renderer";
import {
    AlbumListResponse,
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_LIST,
    EVENT_ALBUM_SONGS,
    EVENT_GET_SONG,
    GetSongRequest,
    GetSongResponse
} from "../../lib/ipc-constants";
import useThemeColours from "../hooks/useThemeColours";
import defaultAlbumArt from "../assets/default-album-art.svg";
import {selectAlbum} from "../reducers/albumListingRoute";
import {ErrorLabel} from "./lib/ErrorLabel";
import {SongList} from "./lib/SongList";
import {
    cancelPlaying,
    clearQueue,
    queueAlbum,
    beginQueue,
    playAlbumNext,
    playAlbumAfterNext
} from "../reducers/queue";
import {PlayButton} from "./lib/PlayButton";
import {useAppDispatch, useAppSelector} from "../store-hooks";
import {ContextMenu, MenuItem, useContextMenu} from "./lib/ContextMenu";
import {AlbumArt} from "./lib/AlbumArt";
import {TransText} from "./lib/TransText";
import {FadeOverflow} from "./lib/FadeOverflow";

const fetchAlbums = () => invoke<AlbumListResponse>(EVENT_ALBUM_LIST);
const fetchAlbumSongs = (albumId: number) =>
    invoke<AlbumSongsResponse, AlbumSongsRequest>(EVENT_ALBUM_SONGS, {albumId});

const checkAlbumPlaying = async (songId: number | null, albumId: number) => {
    if (songId === null) return false;
    const {song} = await invoke<GetSongResponse, GetSongRequest>(
        EVENT_GET_SONG,
        {songId}
    );
    return song.albumId === albumId;
};

interface AlbumProps {
    album: AlbumType;
    isSelected: boolean;
    style?: CSSProperties;
}

const ContainerImpl: FC<{className?: string}> = props => (
    <Box className={props.className}>{props.children}</Box>
);
ContainerImpl.displayName = "Container";

const Container = chakra(ContainerImpl);

const Album: FC<AlbumProps> = ({album, isSelected, ...props}) => {
    const dispatch = useAppDispatch();
    const {onContextMenu, props: contextMenuProps} = useContextMenu();

    const [isHovered, setHovered] = useBoolean();

    const currentSongId = useAppSelector(v => v.queue.nowPlaying);

    const isAlbumPlaying = useAsync(checkAlbumPlaying, [
        currentSongId,
        album.id
    ]);

    const artPath = album.art?.path || defaultAlbumArt;

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

    return (
        <HStack
            pr={4}
            cursor="pointer"
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

            <AlbumArt artPath={artPath} width={24} mr={4} borderRadius={0} />
            <FadeOverflow flex={1}>
                <Heading
                    size="md"
                    textDecoration={isHovered && "underline"}
                    whiteSpace="nowrap"
                >
                    {album.name}
                </Heading>
                <HStack divider={<Text mx={2}>·</Text>}>
                    <Text whiteSpace="nowrap">by {album.artist.name}</Text>
                </HStack>
            </FadeOverflow>

            <PlayButton
                size="lg"
                isCurrent={isAlbumPlaying.result || false}
                isHovered={isHovered}
                onPlay={handleAlbumPlay}
            />
        </HStack>
    );
};

interface AlbumListProps {
    albums: AlbumType[];
    selectedAlbum: number;
    height: number;
    listRef?: MutableRefObject<FixedSizeList>;
}

const AlbumList: FC<AlbumListProps> = ({
    albums,
    selectedAlbum,
    height,
    ...props
}) => (
    <AutoSizer>
        {size => (
            <FixedSizeList
                itemSize={100}
                itemCount={albums.length}
                itemData={albums.map(item => ({
                    album: item,
            selected: item.id === selectedAlbum
        }))}
                }))}
                width={size.width}
                height={size.height}
                className="custom-scroll"
                ref={props.listRef}
            >
                {({data, index, style}) => (
                    <Album
                        album={data[index].album}
                        isSelected={data[index].selected}
                        style={style}
                    />
                )}
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
    const playingAlbum = useAsync(fetchAlbumIdOf, [playingSong]);
    const albums = useAsync(fetchAlbums, []);
    const albumSongs = useAsync(fetchAlbumSongs, [selectedAlbum]);
    const albumListRef = useRef<FixedSizeList>();

    useEffect(() => {
        const {current} = albumListRef;
        if (!current) return;

        const {albums: albumList} = albums.result || {};
        if (!albumList) return;

        const index = albumList.findIndex(v => v.id === selectedAlbum);
        current.scrollToItem(index, "smart");
    }, [albumListRef.current, albums.result, selectedAlbum]);

    const sortedSongs = useMemo(() => {
        const songs = albumSongs.result?.songs.slice() ?? [];
        return songs.sort((a, b) => a.trackNo - b.trackNo);
    }, [albumSongs.result?.songs]);

    if (albums.error) {
        return <ErrorLabel message={albums.error.message} />;
    } else {
        return (
            <HStack
                justify="start"
                align="stretch"
                spacing={0}
                background={colours.backgroundL2}
                height="100%"
            >
                <Container flexGrow={1}>
                    {albums.loading ? (
                        Array.from({length: 4}, (_, i) => (
                            <Skeleton key={i} width="full" mx={4} mt={4} />
                        ))
                    ) : (
                        <AlbumList
                            albums={albums.result.albums}
                            selectedAlbum={selectedAlbum}
                                    height={size.height}
                            listRef={albumListRef}
                        />
                    )}
                </Container>

                {sortedSongs.length > 0 && <Divider orientation="vertical" />}

                {sortedSongs.length > 0 && (
                    <Container width="28rem">
                        <SongList songs={sortedSongs} />
                    </Container>
                )}
            </HStack>
        );
    }
};
