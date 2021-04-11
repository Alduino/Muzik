import type {Album as AlbumType} from "@muzik/database";
import {
    Center,
    Heading,
    HStack,
    Image,
    LinkBox,
    LinkOverlay,
    Skeleton,
    Stack,
    Text
} from "@chakra-ui/react";
import React, {CSSProperties, FC, useEffect, useState} from "react";
import {useAsync} from "react-async-hook";
import {FixedSizeList} from "react-window";
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
import {FloatingContainer} from "./lib/FloatingContainer";
import {
    cancelPlaying,
    clearQueue,
    queueAlbum,
    beginQueue
} from "../reducers/queue";
import {PlayButton} from "./lib/PlayButton";
import {useAppDispatch, useAppSelector} from "../store-hooks";

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

const Album: FC<AlbumProps> = ({album, isSelected, ...props}) => {
    const colours = useThemeColours();
    const dispatch = useAppDispatch();

    const [isHovered, setHovered] = useState(false);

    const currentSongId = useAppSelector(v => v.queue.nowPlaying);

    const isAlbumPlaying = useAsync(checkAlbumPlaying, [
        currentSongId,
        album.id
    ]);

    const artPath = album.artPath
        ? `music-store://${album.artPath}`
        : defaultAlbumArt;

    const handleAlbumSelect = () => {
        dispatch(selectAlbum(album.id));
    };

    const handleAlbumPlay = () => {
        dispatch(cancelPlaying());
        dispatch(clearQueue());
        dispatch(queueAlbum(album.id)).then(() => dispatch(beginQueue()));
    };

    return (
        <LinkBox
            width="full"
            style={props.style}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
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
}

const AlbumList: FC<AlbumListProps> = ({albums, selectedAlbum, height}) => (
    <FixedSizeList
        itemSize={144}
        height={height}
        itemCount={albums.length}
        itemData={albums.map(item => ({
            album: item,
            selected: item.id === selectedAlbum
        }))}
        width="100%"
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
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const selectedAlbum = useAppSelector(
        v => v.albumListingRoute.selectedAlbum
    );
    const albums = useAsync(fetchAlbums, []);
    const albumSongs = useAsync(fetchAlbumSongs, [selectedAlbum]);
    const colours = useThemeColours();

    useEffect(() => {
        function handler() {
            setWindowHeight(window.innerHeight);
        }

        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    });

    if (albums.error) {
        return <ErrorLabel message={albums.error.message} />;
    } else {
        return (
            <HStack m={24} spacing={24}>
                <FloatingContainer>
                    <Center
                        height={12}
                        background={colours.backgroundL3}
                        shadow="sm"
                    >
                        <Heading size="md">Albums</Heading>
                    </Center>
                    {albums.loading ? (
                        Array.from({length: 4}, (_, i) => (
                            <Skeleton key={i} width="full" mx={4} mt={4} />
                        ))
                    ) : (
                        <AlbumList
                            albums={albums.result.albums}
                            selectedAlbum={selectedAlbum}
                            height={windowHeight - 96 * 2 - 48}
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
                            height={windowHeight - 96 * 2 - 48}
                        />
                    </FloatingContainer>
                )}

                {albumSongs.status === "error" && (
                    <ErrorLabel message={albumSongs.error?.message} />
                )}
            </HStack>
        );
    }
};
