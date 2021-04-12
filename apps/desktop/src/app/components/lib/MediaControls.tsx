import React, {FC, useState} from "react";
import {
    Box,
    Divider,
    Heading,
    HStack,
    IconButton,
    Image,
    Link,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Text,
    VStack
} from "@chakra-ui/react";
import {GrRewind} from "react-icons/gr";
import {useAsync} from "react-async-hook";
import {Song as SongType} from "@muzik/database";
import {FloatingContainer} from "./FloatingContainer";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_SONG} from "../../../lib/ipc-constants";
import {GrFastForward, GrPause, GrPlay} from "react-icons/all";
import useThemeColours from "../../hooks/useThemeColours";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import {
    beginQueue,
    setCurrentTime,
    setPaused,
    setResumed,
    skipToNext,
    skipToPrevious
} from "../../reducers/queue";
import {selectAlbum} from "../../reducers/albumListingRoute";
import {formatDuration} from "../../utils/formatDuration";

interface AlbumArtProps {
    artPath: string;
}

const AlbumArt: FC<AlbumArtProps> = props => (
    <Image
        width={16}
        height={16}
        src={props.artPath}
        borderRadius="md"
        objectFit="cover"
    />
);

interface SongInfoProps {
    song: SongType;
}

const SongInfo: FC<SongInfoProps> = props => {
    const dispatch = useAppDispatch();
    const colours = useThemeColours();

    const handleAlbumClick = () => {
        dispatch(selectAlbum(props.song.album.id));
    };

    return (
        <VStack align="start" overflow="hidden" position="relative" spacing={0}>
            <Heading size="sm" whiteSpace="nowrap" mb={2}>
                {props.song.name}
            </Heading>
            <Text whiteSpace="nowrap">
                {props.song.album.artist.name}
                {" - "}
                <Link href="#" onClick={handleAlbumClick}>
                    {props.song.album.name}
                </Link>
            </Text>
            <Box
                position="absolute"
                mt={0}
                top={0}
                bottom={0}
                width={12}
                right={0}
                bgGradient={`linear(to-r,transparent,${colours.backgroundL1})`}
                pointerEvents="none"
            />
        </VStack>
    );
};

interface SongTrackerProps {
    duration: number;
}

const SongTracker: FC<SongTrackerProps> = props => {
    const dispatch = useAppDispatch();

    const [isDisplayOverride, useDisplayOverride] = useState(false);

    const [displayOverrideTime, setDisplayOverrideTime] = useState(0);

    const currentTime = useAppSelector(state => state.queue.currentTime);

    const currentDisplayTime = isDisplayOverride
        ? displayOverrideTime
        : currentTime;
    const currentTimeString = formatDuration(currentDisplayTime);

    const durationString = props.duration
        ? formatDuration(props.duration)
        : "--:--";

    const handleChangeStart = () => {
        useDisplayOverride(true);
    };

    const handleChangeEnd = () => {
        if (!isDisplayOverride) return;
        dispatch(setCurrentTime(displayOverrideTime));
        useDisplayOverride(false);
    };

    const handleTimeChange = (percent: number) => {
        if (!props.duration) return;
        if (!isDisplayOverride) return;
        setDisplayOverrideTime((percent / 100) * props.duration);
    };

    return (
        <HStack flex={1} spacing={4}>
            <Text size="sm" opacity={0.8}>
                {currentTimeString}
            </Text>

            <Slider
                aria-label="Song time"
                value={(currentDisplayTime / (props.duration || 1)) * 100}
                flex={1}
                focusThumbOnChange={false}
                onChangeStart={handleChangeStart}
                onChangeEnd={handleChangeEnd}
                onChange={handleTimeChange}
                step={100 / props.duration}
            >
                <SliderTrack>
                    <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
            </Slider>

            <Text size="sm" opacity={0.8}>
                {durationString}
            </Text>
        </HStack>
    );
};

interface MediaButtonProps {
    canSkipBackwards: boolean;
    canSkipForwards: boolean;
    canPlayPause: boolean;
}

const MediaButtons: FC<MediaButtonProps> = props => {
    const dispatch = useAppDispatch();
    const isPlaying = useAppSelector(state => state.queue.isPlaying);
    const isPaused = useAppSelector(state => state.queue.nowPlaying !== null);
    const colours = useThemeColours();

    const iconProps = {
        style: colours.invertTheme
    };

    const iconButtonProps = {
        isRound: true,
        variant: "ghost"
    };

    const handlePreviousSong = () => dispatch(skipToPrevious());
    const handleNextSong = () => dispatch(skipToNext());
    const handlePause = () => dispatch(setPaused());

    const handlePlay = () => {
        if (isPaused) dispatch(setResumed());
        else dispatch(beginQueue());
    };

    return (
        <HStack>
            <IconButton
                {...iconButtonProps}
                aria-label="Previous song"
                icon={<GrRewind {...iconProps} />}
                isDisabled={!props.canSkipBackwards}
                onClick={handlePreviousSong}
            />

            {isPlaying ? (
                <IconButton
                    {...iconButtonProps}
                    aria-label="Pause"
                    icon={<GrPause {...iconProps} />}
                    isDisabled={!props.canPlayPause}
                    onClick={handlePause}
                />
            ) : (
                <IconButton
                    {...iconButtonProps}
                    aria-label="Play"
                    icon={<GrPlay {...iconProps} />}
                    isDisabled={!props.canPlayPause}
                    onClick={handlePlay}
                />
            )}

            <IconButton
                {...iconButtonProps}
                aria-label="Next song"
                icon={<GrFastForward {...iconProps} />}
                isDisabled={!props.canSkipForwards}
                onClick={handleNextSong}
            />
        </HStack>
    );
};

const getSong = (songId: number) =>
    songId === null ? null : invoke(EVENT_GET_SONG, {songId});

export const MediaControls: FC = () => {
    const currentSongId = useAppSelector(state => state.queue.nowPlaying);
    const previousSongsCount = useAppSelector(
        state => state.queue.previousSongs.length
    );
    const nextSongsCount = useAppSelector(
        state => state.queue.playNextSongs.length + state.queue.songs.length
    );

    const currentSong = useAsync(getSong, [currentSongId]);

    return (
        <HStack p={4} spacing={4} height={24}>
            <AlbumArt
                artPath={
                    currentSong.result?.song.album.art?.path || defaultAlbumArt
                }
            />

            <Box width="16rem">
                {currentSong.result && (
                    <SongInfo song={currentSong.result.song} />
                )}
            </Box>

            <Divider orientation="vertical" />

            <SongTracker duration={currentSong.result?.song.duration} />

            <Divider orientation="vertical" />

            <MediaButtons
                canSkipBackwards={previousSongsCount > 0}
                canSkipForwards={nextSongsCount > 0}
                canPlayPause={currentSongId !== null || nextSongsCount > 0}
            />
        </HStack>
    );
};
