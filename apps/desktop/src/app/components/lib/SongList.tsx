import {
    Box,
    Center,
    Divider,
    Heading,
    HStack,
    Text,
    useBoolean
} from "@chakra-ui/react";
import type {Song as SongType} from "@muzik/database";
import React, {CSSProperties, FC, useEffect, useRef} from "react";
import {FixedSizeList} from "react-window";
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
import {invoke} from "../../../lib/ipc/renderer";
import {
    EVENT_CLIPBOARD_WRITE,
    EVENT_FILEDIR_OPEN
} from "../../../lib/ipc-constants";
import {useTranslation} from "react-i18next";
import {TransText} from "./TransText";
import {FadeOverflow} from "./FadeOverflow";
import {AlbumArt} from "./AlbumArt";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import AutoSizer from "react-virtualized-auto-sizer";
import {PlayButtonAlbumArt} from "./PlayButtonAlbumArt";
import {VisualiserIcon} from "./AudioController";

interface SongProps {
    song: SongType;
    style?: CSSProperties;
}

const Song: FC<SongProps> = props => {
    const dispatch = useAppDispatch();
    const {t} = useTranslation("app");
    const {onContextMenu, props: contextMenuProps} = useContextMenu();

    const titleRef = useRef<HTMLHeadingElement>();

    const [isHovered, setHovered] = useBoolean();

    const currentSongId = useAppSelector(v => v.queue.nowPlaying);
    const isCurrent = currentSongId === props.song.id;

    const artPath = props.song.album.art?.path || defaultAlbumArt;

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

    const handleCopyPath = () => {
        invoke(EVENT_CLIPBOARD_WRITE, {
            text: props.song.path,
            bookmark: t("title.playing", {
                artist: props.song.album.artist.name,
                track: props.song.name
            })
        });
    };

    const handleOpenDirectory = () => {
        invoke(EVENT_FILEDIR_OPEN, {
            path: props.song.path
        });
    };

    const durationText = formatDuration(props.song.duration);

    return (
        <HStack
            pr={4}
            pl={2}
            style={props.style}
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
                <Divider direction="horizontal" />
                <MenuItem onClick={handleCopyPath}>
                    <TransText k="utils.copyFilePath" />
                </MenuItem>
                <MenuItem onClick={handleOpenDirectory}>
                    <TransText k="utils.openContainingFolder" />
                </MenuItem>
            </ContextMenu>

            <PlayButtonAlbumArt
                isHovered={isHovered}
                isCurrent={isCurrent}
                artPath={artPath}
                artSize={16}
                buttonSize="sm"
                onPlay={handleSongPlay}
            />

            <FadeOverflow flexGrow={1}>
                <HStack>
                    <Heading size="sm" whiteSpace="nowrap" ref={titleRef}>
                        {props.song.name}
                    </Heading>
                    {isCurrent && (
                        <VisualiserIcon bands={3} width={4} height={4} />
                    )}
                </HStack>
                <Text fontSize="sm" opacity={0.5}>
                    {props.song.album.artist.name}
                </Text>
            </FadeOverflow>

            <Text fontSize="sm" opacity={0.5}>
                {durationText}
            </Text>
        </HStack>
    );
};

export interface SongListProps {
    songs: SongType[];
}

export const SongList: FC<SongListProps> = props => (
    <AutoSizer>
        {size => (
            <FixedSizeList
                itemSize={68}
                itemCount={props.songs.length}
                width={size.width}
                height={size.height}
                itemData={props.songs}
                className="custom-scroll"
            >
                {({data, index, style}) => (
                    <Song song={data[index]} style={style} />
                )}
            </FixedSizeList>
        )}
    </AutoSizer>
);
