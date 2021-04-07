import {Heading, HStack} from "@chakra-ui/react";
import type {Song as SongType} from "@muzik/database";
import React, {CSSProperties, FC} from "react";
import {FixedSizeList} from "react-window";
import useThemeColours from "../../hooks/useThemeColours";

interface SongProps {
    song: SongType;
    style?: CSSProperties;
}

const Song: FC<SongProps> = props => {
    const colours = useThemeColours();

    return (
        <HStack
            width="calc(100% - 2rem)"
            background={colours.backgroundL2}
            p={2}
            borderRadius="sm"
            shadow="md"
            height={8}
            mt={4}
            mb={-2}
            mx={4}
        >
            <Heading size="sm">{props.song.name}</Heading>
        </HStack>
    );
};

export interface SongListProps {
    songs: SongType[];
    height: number;
}

export const SongList: FC<SongListProps> = props => (
    <FixedSizeList
        itemSize={32}
        height={props.height}
        itemCount={props.songs.length}
        width="100%"
        itemData={props.songs}
    >
        {({data, index, style}) => <Song song={data[index]} style={style} />}
    </FixedSizeList>
);
