import {
    Heading,
    HStack,
    Image,
    LinkBox,
    LinkOverlay,
    Skeleton,
    Stack,
    StackDivider,
    Text,
    VStack
} from "@chakra-ui/react";
import React, {FC} from "react";
import {Album as AlbumType} from "@muzik/database";
import {useAsync} from "react-async-hook";
import {invoke} from "../../lib/ipc/renderer";
import {AlbumListResponse, EVENT_ALBUM_LIST} from "../../lib/ipc-constants";
import useThemeColours from "../hooks/useThemeColours";
import defaultAlbumArt from "../assets/default-album-art.svg";
import {ErrorLabel} from "./lib/ErrorLabel";
import {useSelector} from "react-redux";
import {RootState} from "../reducers/root";
import {useAppDispatch} from "../store";
import {selectAlbum} from "../reducers/albumListingRoute";

const fetchAlbums = () => invoke<AlbumListResponse>(EVENT_ALBUM_LIST);

interface AlbumProps {
    album: AlbumType;
    isSelected: boolean;
}

const Album: FC<AlbumProps> = ({album, isSelected}) => {
    const colours = useThemeColours();
    const dispatch = useAppDispatch();

    const artPath = album.artPath
        ? `music-store://${album.artPath}`
        : defaultAlbumArt;

    const handleAlbumClick = () => {
        dispatch(selectAlbum(album.id));
    };

    return (
        <LinkBox width="full">
            <HStack
                width="full"
                background={colours.backgroundL2}
                p={4}
                borderRadius="sm"
                shadow={isSelected ? "outline" : "md"}
            >
                <Image src={artPath} width={24} mr={4} borderRadius="sm" />
                <Stack direction="column">
                    <Heading size="md">
                        <LinkOverlay href="#" onClick={handleAlbumClick}>
                            {album.name}
                        </LinkOverlay>
                    </Heading>
                    <HStack divider={<Text mx={2}>·</Text>}>
                        <Text>by {album.artist.name}</Text>
                    </HStack>
                </Stack>
            </HStack>
        </LinkBox>
    );
};

export const AlbumListing: FC = () => {
    const albums = useAsync(fetchAlbums, []);
    const selectedAlbum = useSelector<RootState, number>(
        v => v.albumListingRoute.selectedAlbum
    );

    const colours = useThemeColours();

    return (
        <VStack
            mt={24}
            ml={24}
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
                            album={{
                                id: -1,
                                name: "Spooky Scary Skeletons",
                                artist: {id: -1, name: "The Skeleton Man"},
                                artistId: -1,
                                artPath: null
                            }}
                            isSelected={false}
                        />
                    </Skeleton>
                ))
            ) : albums.result ? (
                albums.result.albums.map(album => (
                    <Album
                        key={album.id}
                        album={album}
                        isSelected={album.id === selectedAlbum}
                    />
                ))
            ) : (
                <ErrorLabel message={albums.error.message} />
            )}
        </VStack>
    );
};
