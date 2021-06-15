import {
    chakra,
    Divider,
    Heading,
    HStack,
    Stack,
    Text,
    useBoolean
} from "@chakra-ui/react";
import React, {CSSProperties, FC, useRef} from "react";
import {useTranslation} from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import {FixedSizeList} from "react-window";
import {EVENT_CLIPBOARD_WRITE} from "../../../lib/ipc-constants";
import {invoke} from "../../../lib/ipc/renderer";
import openFileDirectory from "../../../lib/rpc/open-file-directory/app";
import useAlbumArt from "../../hooks/useAlbumArt";
import useDraggable from "../../hooks/useDraggable";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    playAfterNext,
    playNext,
    queueAlbum,
    queueSong
} from "../../reducers/queue";
import {useNames, useTrack} from "../../rpc";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {formatDuration} from "../../utils/formatDuration";
import {VisualiserIcon} from "./AudioController";
import {ContextMenu, MenuItem, useContextMenu} from "./ContextMenu";
import {FadeOverflow} from "./FadeOverflow";
import {PlayButtonAlbumArt} from "./PlayButtonAlbumArt";
import {TransText} from "./TransText";

interface TrackProps {
    trackId: number;
    clearQueueOnPlay: boolean;
    style?: CSSProperties;
}

export const Track = chakra((props: TrackProps) => {
    const dispatch = useAppDispatch();
    const {t} = useTranslation("app");
    const {onContextMenu, props: contextMenuProps} = useContextMenu();
    const {onDragStart, onDragEnd, props: draggableProps} = useDraggable({
        resize: (w, h) => [300, h],
        offset: (w, h) => [40, h / 2]
    });

    const titleRef = useRef<HTMLHeadingElement>();

    const [isHovered, setHovered] = useBoolean();

    const currentSongId = useAppSelector(v => v.queue.nowPlaying);
    const isCurrent = currentSongId === props.trackId;

    const {data: track} = useTrack(props.trackId);
    const {data: names} = useNames(props.trackId);

    const albumArt = useAlbumArt(props.trackId);

    const handleSongPlay = () => {
        dispatch(cancelPlaying());
        if (props.clearQueueOnPlay) dispatch(clearQueue());
        dispatch(queueSong(props.trackId));
        dispatch(beginQueue());
    };

    const handleAlbumPlay = () => {
        dispatch(cancelPlaying());
        if (props.clearQueueOnPlay) dispatch(clearQueue());
        dispatch(queueAlbum(track?.albumId)).then(() => dispatch(beginQueue()));
    };

    const handlePlayNext = () => {
        dispatch(playNext(props.trackId));
    };

    const handleAddToQueue = () => {
        dispatch(playAfterNext(props.trackId));
    };

    const handleCopyPath = () => {
        invoke(EVENT_CLIPBOARD_WRITE, {
            text: track?.audioSrcPath,
            bookmark: t("title.playing", {
                artist: names?.artist,
                track: names?.track
            })
        });
    };

    const handleOpenDirectory = () => {
        if (track) {
            openFileDirectory({filePath: track.audioSrcPath});
        }
    };

    const durationText = formatDuration(track?.duration ?? 0);

    return (
        <HStack
            pr={4}
            pl={2}
            style={props.style}
            onMouseEnter={setHovered.on}
            onMouseLeave={setHovered.off}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onContextMenu={onContextMenu}
            {...draggableProps}
        >
            <ContextMenu {...contextMenuProps}>
                <MenuItem onClick={handleSongPlay}>
                    <TransText k="queueControls.playSong" />
                </MenuItem>
                <MenuItem onClick={handleAlbumPlay}>
                    <TransText k="queueControls.playAlbum" />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleAddToQueue}>
                    <TransText k="queueControls.addToQueue" />
                </MenuItem>
                <MenuItem onClick={handlePlayNext}>
                    <TransText k="queueControls.playNext" />
                </MenuItem>
                <Divider />
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
                artSize={16}
                buttonSize="sm"
                onPlay={handleSongPlay}
                {...albumArt}
            />

            <FadeOverflow flexGrow={1}>
                <HStack>
                    <Heading size="sm" whiteSpace="nowrap" ref={titleRef}>
                        {track?.name}
                    </Heading>
                    {isCurrent && (
                        <VisualiserIcon bands={3} width={4} height={4} />
                    )}
                </HStack>
                <Text fontSize="sm" opacity={0.5}>
                    {names?.artist}
                </Text>
            </FadeOverflow>
            <Text fontSize="sm" opacity={0.5}>
                {durationText}
            </Text>
        </HStack>
    );
});

export interface SongListProps {
    songIds: number[];
    clearQueueOnPlay?: boolean;
}

export const SongList: FC<SongListProps> = props => (
    <AutoSizer>
        {size => (
            <FixedSizeList
                itemSize={68}
                itemCount={props.songIds.length}
                width={size.width}
                height={size.height}
                itemData={props.songIds}
                className="custom-scroll"
            >
                {({data, index, style}) => (
                    <Track
                        trackId={data[index]}
                        clearQueueOnPlay={props.clearQueueOnPlay !== false}
                        style={style}
                    />
                )}
            </FixedSizeList>
        )}
    </AutoSizer>
);

export const LiteralSongList: FC<SongListProps> = props => (
    <Stack>
        {props.songIds.map((id, idx) => (
            <Track
                trackId={id}
                clearQueueOnPlay={props.clearQueueOnPlay !== false}
                key={idx}
            />
        ))}
    </Stack>
);
