import {
    Heading,
    HStack,
    Image,
    Skeleton,
    Stack,
    StackDivider,
    Text,
    VStack
} from "@chakra-ui/react";
import React, {FC} from "react";
import {Album as AlbumType, Song as SongType} from "@muzik/database";
import {pluralize} from "@alduino/humanizer/string";
import {useAsync} from "react-async-hook";
import {invoke} from "../../lib/ipc/renderer";
import {AlbumListResponse, EVENT_ALBUM_LIST} from "../../lib/ipc-constants";
import useThemeColours from "../hooks/useThemeColours";
import defaultAlbumArt from "../assets/default-album-art.svg";
import {ErrorLabel} from "./lib/ErrorLabel";

const fetchAlbums = () => invoke<AlbumListResponse>(EVENT_ALBUM_LIST);

const Album: FC<AlbumType & {songs: SongType[]}> = props => {
    const colours = useThemeColours();

    const songsKeyword = props.songs.length === 1 ? "song" : pluralize("song");

    const artPath = props.artPath
        ? `music-store://${props.artPath}`
        : defaultAlbumArt;

    return (
        <HStack
            width="full"
            background={colours.backgroundL2}
            p={4}
            borderRadius="sm"
            shadow="md"
        >
            <Image src={artPath} width={24} mr={4} borderRadius="sm" />
            <Stack direction="column">
                <Heading size="md">{props.name}</Heading>
                <HStack divider={<Text mx={2}>·</Text>}>
                    <Text>by {props.artist.name}</Text>
                    <Text>
                        {props.songs.length} {songsKeyword}
                    </Text>
                </HStack>
            </Stack>
        </HStack>
    );
};

export const AlbumListing: FC = () => {
    const albums = useAsync(fetchAlbums, []);

    const colours = useThemeColours();

    return (
        <VStack>
            <VStack
                mt={24}
                p={4}
                borderRadius="md"
                shadow="lg"
                background={colours.backgroundL1}
                color={colours.text}
                width="container.sm"
                divider={<StackDivider borderColor={colours.backgroundL3} />}
            >
                {albums.loading ? (
                    Array.from({length: 4}, (_, i) => (
                        <Skeleton key={i} width="full">
                            <Album
                                id={-1}
                                artPath={null}
                                name="Skeleton Dance"
                                artistId={-1}
                                artist={{name: "The Skeleton Man", id: -1}}
                                songs={[]}
                            />
                        </Skeleton>
                    ))
                ) : albums.result ? (
                    albums.result.albums.map(album => (
                        <Album key={album.id} {...album} songs={[]} />
                    ))
                ) : (
                    <ErrorLabel message={albums.error.message} />
                )}
            </VStack>
        </VStack>
    );
};
