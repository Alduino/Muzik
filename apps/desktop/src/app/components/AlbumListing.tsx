import type {Album as AlbumType} from "@muzik/database";
import {
    Box,
    Center,
    Heading,
    HStack,
    IconButton,
    Image,
    LinkBox,
    LinkOverlay,
    Skeleton,
    Stack,
    Text,
    VStack
} from "@chakra-ui/react";
import React, {
    CSSProperties,
    FC,
    MutableRefObject,
    useEffect,
    useRef,
    useState
} from "react";
import {useAsync} from "react-async-hook";
import {FixedSizeList} from "react-window";
import {GrPlay} from "react-icons/gr";
import {IoShuffle} from "react-icons/io5";
import {invoke} from "../../lib/ipc/renderer";
import {
    AlbumListResponse,
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_LIST,
    EVENT_ALBUM_SONGS,
    EVENT_GET_ALL_SONG_IDS,
    EVENT_GET_SONG,
    GetSongRequest,
    GetSongResponse
} from "../../lib/ipc-constants";
import useThemeColours from "../hooks/useThemeColours";
import defaultAlbumArt from "../assets/default-album-art.svg";
import {selectAlbum} from "../reducers/albumListingRoute";
import {ErrorLabel} from "./lib/ErrorLabel";
import {SongList} from "./lib/SongList";
import {FloatingContainer} from "./lib/FloatingContainer";
import {
    cancelPlaying,
    clearQueue,
    queueAlbum,
    beginQueue,
    shuffleQueue,
    queueSongs,
    playAlbumNext,
    playAlbumAfterNext
} from "../reducers/queue";
import {PlayButton} from "./lib/PlayButton";
import {useAppDispatch, useAppSelector} from "../store-hooks";
import {MediaControls} from "./lib/MediaControls";
import {ContextMenu, MenuItem, useContextMenu} from "./lib/ContextMenu";

const fetchAlbums = () => invoke<AlbumListResponse>(EVENT_ALBUM_LIST);
const fetchAlbumSongs = (albumId: number) =>
    invoke<AlbumSongsResponse, AlbumSongsRequest>(EVENT_ALBUM_SONGS, {albumId});
const fetchAllSongIds = () => invoke(EVENT_GET_ALL_SONG_IDS);

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

const Album: FC<AlbumProps> = ({album, isSelected, ...props}) => {
    const colours = useThemeColours();
    const dispatch = useAppDispatch();
    const {onContextMenu, props: contextMenuProps} = useContextMenu();

    const [isHovered, setHovered] = useState(false);

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
        <LinkBox
            width="full"
            style={props.style}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onContextMenu={onContextMenu}
        >
            <ContextMenu {...contextMenuProps}>
                <MenuItem onClick={handleAddToQueue}>
                    <Text>Add to queue</Text>
                </MenuItem>
                <MenuItem onClick={handlePlayNext}>
                    <Text>Play next</Text>
                </MenuItem>
            </ContextMenu>

            <HStack
                width="calc(100% - 2em)"
                background={colours.backgroundL2}
                p={4}
                borderRadius="sm"
                shadow={isSelected ? "outline" : "sm"}
                height={128}
                mt={4}
                mx={4}
            >
                <Image src={artPath} width={24} mr={4} borderRadius="sm" />
                <Stack direction="column" flex={1}>
                    <Heading size="md">
                        <LinkOverlay href="#" onClick={handleAlbumSelect}>
                            {album.name}
                        </LinkOverlay>
                    </Heading>
                    <HStack divider={<Text mx={2}>·</Text>}>
                        <Text>by {album.artist.name}</Text>
                    </HStack>
                </Stack>
                <PlayButton
                    size="lg"
                    isCurrent={isAlbumPlaying.result || false}
                    isHovered={isHovered}
                    onPlay={handleAlbumPlay}
                />
            </HStack>
        </LinkBox>
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
    <FixedSizeList
        itemSize={144}
        height={height}
        itemCount={albums.length}
        itemData={albums.map(item => ({
            album: item,
            selected: item.id === selectedAlbum
        }))}
        width="100%"
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
);

export const AlbumListing: FC = () => {
    const dispatch = useAppDispatch();
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const selectedAlbum = useAppSelector(
        v => v.albumListingRoute.selectedAlbum
    );
    const albums = useAsync(fetchAlbums, []);
    const albumSongs = useAsync(fetchAlbumSongs, [selectedAlbum]);
    const colours = useThemeColours();
    const albumListRef = useRef<FixedSizeList>();

    useEffect(() => {
        function handler() {
            setWindowHeight(window.innerHeight);
        }

        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    });

    useEffect(() => {
        const {current} = albumListRef;
        if (!current) return;

        const {albums: albumList} = albums.result || {};
        if (!albumList) return;

        const index = albumList.findIndex(v => v.id === selectedAlbum);
        current.scrollToItem(index, "smart");
    }, [albumListRef.current, albums.result, selectedAlbum]);

    const handlePlayAll = async () => {
        dispatch(cancelPlaying());

        const allSongIds = await fetchAllSongIds();
        dispatch(queueSongs(allSongIds.songIds));

        dispatch(beginQueue());
    };

    const handleShuffleAll = async () => {
        dispatch(cancelPlaying());

        const allSongIds = await fetchAllSongIds();
        dispatch(queueSongs(allSongIds.songIds));

        dispatch(shuffleQueue());
        dispatch(beginQueue());
    };

    if (albums.error) {
        return <ErrorLabel message={albums.error.message} />;
    } else {
        return (
            <VStack spacing={24}>
                <Box width="full" shadow="lg">
                    <MediaControls />
                </Box>

                <HStack spacing={24}>
                    <FloatingContainer>
                        <HStack
                            height={12}
                            background={colours.backgroundL3}
                            shadow="sm"
                            justify="center"
                            px={4}
                        >
                            <Heading size="md">Albums</Heading>
                            <Box flex={1} />
                            <IconButton
                                aria-label="Play all"
                                icon={<GrPlay style={colours.invertTheme} />}
                                variant="ghost"
                                size="sm"
                                isRound
                                onClick={handlePlayAll}
                            />
                            <IconButton
                                aria-label="Play all"
                                icon={<IoShuffle color={colours.text} />}
                                variant="ghost"
                                size="sm"
                                isRound
                                onClick={handleShuffleAll}
                            />
                        </HStack>
                        {albums.loading ? (
                            Array.from({length: 4}, (_, i) => (
                                <Skeleton key={i} width="full" mx={4} mt={4} />
                            ))
                        ) : (
                            <AlbumList
                                albums={albums.result.albums}
                                selectedAlbum={selectedAlbum}
                                height={windowHeight - 96 * 3 - 48 - 96}
                                listRef={albumListRef}
                            />
                        )}
                    </FloatingContainer>

                    {albumSongs.result?.songs.length > 0 && (
                        <FloatingContainer>
                            <Center
                                height={12}
                                background={colours.backgroundL3}
                                shadow="sm"
                            >
                                <Heading size="md">Songs</Heading>
                            </Center>
                            <SongList
                                songs={albumSongs.result.songs}
                                height={windowHeight - 96 * 3 - 48 - 96}
                            />
                        </FloatingContainer>
                    )}

                    {albumSongs.status === "error" && (
                        <ErrorLabel message={albumSongs.error?.message} />
                    )}
                </HStack>
            </VStack>
        );
    }
};
