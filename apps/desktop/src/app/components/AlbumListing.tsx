import type {DbArtist} from "@muzik/database";
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
import {useAsync} from "react-async-hook";
import {FixedSizeList} from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import {invoke} from "../../lib/ipc/renderer";
import {
    AlbumListResponse,
    EVENT_ALBUM_LIST,
    EVENT_ALBUM_SONGS,
    EVENT_ARTIST_LIST,
    EVENT_GET_SONG
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
import {useAppDispatch, useAppSelector} from "../store-hooks";
import {ContextMenu, MenuItem, useContextMenu} from "./lib/ContextMenu";
import {TransText} from "./lib/TransText";
import {FadeOverflow} from "./lib/FadeOverflow";
import {PlayButtonAlbumArt} from "./lib/PlayButtonAlbumArt";
import {VisualiserIcon} from "./lib/AudioController";
import ExtendedAlbum from "../../lib/ExtendedAlbum";

const fetchAlbums = () => invoke<AlbumListResponse>(EVENT_ALBUM_LIST);
const fetchArtistsMap = () =>
    invoke(EVENT_ARTIST_LIST).then(
        res => new Map<number, DbArtist>(res.artists.map(val => [val.id, val]))
    );
const fetchAlbumSongs = (albumId: number) =>
    invoke(EVENT_ALBUM_SONGS, {albumId});
const fetchAlbumIdOf = (songId: number) =>
    invoke(EVENT_GET_SONG, {songId}).then(res => res.song.albumId);

const ContainerImpl: FC<{className?: string}> = props => (
    <Box className={props.className} height="fill">
        {props.children}
    </Box>
);
ContainerImpl.displayName = "Container";

const Container = chakra(ContainerImpl);

interface AlbumProps {
    album: ExtendedAlbum;
    artist: DbArtist;
    isPlaying: boolean;
    style?: CSSProperties;
}

const Album: FC<AlbumProps> = ({album, artist, isPlaying, ...props}) => {
    const dispatch = useAppDispatch();
    const {onContextMenu, props: contextMenuProps} = useContextMenu();
    const colours = useThemeColours();

    const selectedAlbum = useAppSelector(
        v => v.albumListingRoute.selectedAlbum
    );
    const isSelected = selectedAlbum === album.id;

    const [isHovered, setHovered] = useBoolean();

    const artPath = album.art?.url || defaultAlbumArt;

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
                    <Heading
                        size="md"
                        textDecoration={isHovered && "underline"}
                        whiteSpace="nowrap"
                    >
                        {album.name}
                    </Heading>
                    {isPlaying && (
                        <VisualiserIcon bands={3} width={4} height={4} />
                    )}
                </HStack>
                <HStack divider={<Text mx={2}>·</Text>}>
                    <Text whiteSpace="nowrap">by {artist.name}</Text>
                </HStack>
            </FadeOverflow>
        </HStack>
    );
};

interface AlbumListProps {
    albums: ExtendedAlbum[];
    artists: Map<number, DbArtist>;
    playingAlbum: number | null;
    listRef?: MutableRefObject<FixedSizeList>;
}

const AlbumList: FC<AlbumListProps> = ({
    albums,
    artists,
    playingAlbum,
    ...props
}) => (
    <AutoSizer>
        {size => (
            <FixedSizeList
                itemSize={100}
                itemCount={albums.length}
                itemData={albums.map(item => ({
                    album: item,
                    playing: item.id === playingAlbum
                }))}
                width={size.width}
                height={size.height}
                className="custom-scroll"
                ref={props.listRef}
            >
                {({data, index, style}) => {
                    const {album, playing} = data[index] as {
                        album: ExtendedAlbum;
                        playing: boolean;
                    };

                    return (
                        <Album
                            album={album}
                            artist={artists.get(album.artistId)}
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
    const playingAlbum = useAsync(fetchAlbumIdOf, [playingSong]);
    const albums = useAsync(fetchAlbums, []);
    const artists = useAsync(fetchArtistsMap, []);
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

    if (albums.error) {
        return <ErrorLabel message={albums.error.message} />;
    } else if (artists.error) {
        return <ErrorLabel message={artists.error.message} />;
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
                    {albums.loading || artists.loading ? (
                        Array.from({length: 4}, (_, i) => (
                            <Skeleton key={i} width="full" mx={4} mt={4} />
                        ))
                    ) : (
                        <AlbumList
                            albums={albums.result.albums}
                            artists={artists.result}
                            playingAlbum={playingAlbum.result}
                            listRef={albumListRef}
                        />
                    )}
                </Container>

                {!albumSongs.result && <Divider orientation="vertical" />}

                {albumSongs.result?.songs.length > 0 && (
                    <Container width="28rem">
                        <SongList songs={albumSongs.result.songs} />
                    </Container>
                )}
            </HStack>
        );
    }
};
