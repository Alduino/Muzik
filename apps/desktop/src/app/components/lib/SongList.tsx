import {
    Box,
    chakra,
    Divider,
    Heading,
    HStack,
    Stack,
    Text,
    useBoolean
} from "@chakra-ui/react";
import React, {CSSProperties, FC, useRef} from "react";
import {FixedSizeList} from "react-window";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {
    beginQueue,
    cancelPlaying,
    clearQueue,
    playAfterNext,
    playNext,
    queueAlbum,
    queueSong
} from "../../reducers/queue";
import {formatDuration} from "../../utils/formatDuration";
import {ContextMenu, MenuItem, useContextMenu} from "./ContextMenu";
import {invoke} from "../../../lib/ipc/renderer";
import {
    EVENT_CLIPBOARD_WRITE,
    EVENT_FILEDIR_OPEN,
    EVENT_GET_NAMES
} from "../../../lib/ipc-constants";
import {useTranslation} from "react-i18next";
import {TransText} from "./TransText";
import {FadeOverflow} from "./FadeOverflow";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import AutoSizer from "react-virtualized-auto-sizer";
import {PlayButtonAlbumArt} from "./PlayButtonAlbumArt";
import {VisualiserIcon} from "./AudioController";
import {ExtendedTrack} from "../../../lib/ExtendedAlbum";
import {useAsync} from "react-async-hook";
import useDraggable from "../../hooks/useDraggable";

interface SongProps {
    song: ExtendedTrack;
    clearQueueOnPlay: boolean;
    style?: CSSProperties;
}

const fetchNames = (trackId: number) => invoke(EVENT_GET_NAMES, {trackId});

export const Song = chakra((props: SongProps) => {
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
    const isCurrent = currentSongId === props.song.id;

    const namesAsync = useAsync(fetchNames, [props.song.id]);

    const artPath = props.song.art?.url || defaultAlbumArt;

    const handleSongPlay = () => {
        dispatch(cancelPlaying());
        if (props.clearQueueOnPlay) dispatch(clearQueue());
        dispatch(queueSong(props.song.id));
        dispatch(beginQueue());
    };

    const handleAlbumPlay = () => {
        dispatch(cancelPlaying());
        if (props.clearQueueOnPlay) dispatch(clearQueue());
        dispatch(queueAlbum(props.song.albumId)).then(() =>
            dispatch(beginQueue())
        );
    };

    const handlePlayNext = () => {
        dispatch(playNext(props.song.id));
    };

    const handleAddToQueue = () => {
        dispatch(playAfterNext(props.song.id));
    };

    const handleCopyPath = async () => {
        const names = await invoke(EVENT_GET_NAMES, {
            trackId: props.song.id
        });

        invoke(EVENT_CLIPBOARD_WRITE, {
            text: props.song.audioSrcPath,
            bookmark: t("title.playing", {
                artist: names.artist,
                track: names.track
            })
        });
    };

    const handleOpenDirectory = () => {
        invoke(EVENT_FILEDIR_OPEN, {
            path: props.song.audioSrcPath
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
                artPath={artPath}
                artSize={16}
                avgArtColour={props.song.art?.avgColour}
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
                    {namesAsync.result?.artist}
                </Text>
            </FadeOverflow>
            <Text fontSize="sm" opacity={0.5}>
                {durationText}
            </Text>
        </HStack>
    );
});

export interface SongListProps {
    songs: ExtendedTrack[];
    clearQueueOnPlay?: boolean;
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
                    <Song
                        song={data[index]}
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
        {props.songs.map(song => (
            <Song
                song={song}
                clearQueueOnPlay={props.clearQueueOnPlay !== false}
                key={song.id}
            />
        ))}
    </Stack>
);
