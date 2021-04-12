import {Box, Heading, HStack, Text} from "@chakra-ui/react";
import type {Song as SongType} from "@muzik/database";
import React, {CSSProperties, FC, useState} from "react";
import {FixedSizeList} from "react-window";
import useThemeColours from "../../hooks/useThemeColours";
import {PlayButton} from "./PlayButton";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    playAfterNext,
    playNext,
    queueSong
} from "../../reducers/queue";
import {formatDuration} from "../../utils/formatDuration";
import {ContextMenu, MenuItem, useContextMenu} from "./ContextMenu";

interface SongProps {
    song: SongType;
    style?: CSSProperties;
}

const Song: FC<SongProps> = props => {
    const dispatch = useAppDispatch();
    const colours = useThemeColours();
    const {onContextMenu, props: contextMenuProps} = useContextMenu();

    const [isHovered, setHovered] = useState(false);

    const currentSongId = useAppSelector(v => v.queue.nowPlaying);
    const isCurrent = currentSongId === props.song.id;

    const handleSongPlay = () => {
        dispatch(cancelPlaying());
        dispatch(clearQueue());
        dispatch(queueSong(props.song.id));
        dispatch(beginQueue());
    };

    const handlePlayNext = () => {
        dispatch(playNext(props.song.id));
    };

    const handleAddToQueue = () => {
        dispatch(playAfterNext(props.song.id));
    };

    const durationText = formatDuration(props.song.duration);

    return (
        <HStack
            width="calc(100% - 2rem)"
            background={colours.backgroundL2}
            px={4}
            py={3}
            borderRadius="sm"
            shadow="md"
            height={12}
            mt={4}
            mb={-2}
            mx={4}
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

            <Heading size="sm">{props.song.name}</Heading>

            <Text fontSize="sm" opacity={0.5}>
                {durationText}
            </Text>

            <Box flex={1} />

            <PlayButton
                size="sm"
                isCurrent={isCurrent}
                isHovered={isHovered}
                onPlay={handleSongPlay}
            />
        </HStack>
    );
};

export interface SongListProps {
    songs: SongType[];
    height: number;
}

export const SongList: FC<SongListProps> = props => (
    <FixedSizeList
        itemSize={56}
        height={props.height}
        itemCount={props.songs.length}
        width="100%"
        itemData={props.songs}
    >
        {({data, index, style}) => <Song song={data[index]} style={style} />}
    </FixedSizeList>
);
