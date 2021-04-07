import type {Album as AlbumType} from "@muzik/database";
import {
    Box,
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
import {AlbumListResponse, EVENT_ALBUM_LIST} from "../../lib/ipc-constants";
import useThemeColours from "../hooks/useThemeColours";
import defaultAlbumArt from "../assets/default-album-art.svg";
import {useSelector} from "react-redux";
import {RootState} from "../reducers/root";
import {useAppDispatch} from "../store";
import {selectAlbum} from "../reducers/albumListingRoute";
import {ErrorLabel} from "./lib/ErrorLabel";

const fetchAlbums = () => invoke<AlbumListResponse>(EVENT_ALBUM_LIST);

interface AlbumProps {
    album: AlbumType;
    isSelected: boolean;
    style?: CSSProperties;
}

const Album: FC<AlbumProps> = ({album, isSelected, ...props}) => {
    const colours = useThemeColours();
    const dispatch = useAppDispatch();

    const artPath = album.artPath
        ? `music-store://${album.artPath}`
        : defaultAlbumArt;

    const handleAlbumClick = () => {
        dispatch(selectAlbum(album.id));
    };

    return (
        <LinkBox width="full" style={props.style}>
            <HStack
                width="calc(100% - 2em)"
                background={colours.backgroundL2}
                p={4}
                borderRadius="sm"
                shadow={isSelected ? "outline" : "md"}
                height={128}
                mt={4}
                mx={4}
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
    const albums = useAsync(fetchAlbums, []);
    const selectedAlbum = useSelector<RootState, number>(
        v => v.albumListingRoute.selectedAlbum
    );

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
            <Box
                mt={24}
                ml={24}
                borderRadius="md"
                shadow="lg"
                background={colours.backgroundL1}
                color={colours.text}
                width="container.sm"
                overflow="hidden"
            >
                {albums.loading ? (
                    Array.from({length: 4}, (_, i) => (
                        <Skeleton key={i} width="full" mx={4} mt={4} />
                    ))
                ) : (
                    <AlbumList
                        albums={albums.result.albums}
                        selectedAlbum={selectedAlbum}
                        height={windowHeight - 96 * 2}
                    />
                )}
            </Box>
        );
    }
};
