import React, {FC, useState} from "react";
import {
    chakra,
    Divider,
    Heading,
    HStack,
    IconButton,
    Link,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Text
} from "@chakra-ui/react";
import {GrRewind, GrFastForward, GrPause, GrPlay} from "react-icons/gr";
import {RiShuffleLine, RiRepeat2Line, RiRepeatOneLine} from "react-icons/ri";
import {useAsync} from "react-async-hook";
import {useTranslation} from "react-i18next";
import {DbTrack} from "@muzik/database";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_NAMES, EVENT_GET_SONG} from "../../../lib/ipc-constants";
import useThemeColours from "../../hooks/useThemeColours";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import {
    beginQueue,
    RepeatMode,
    setCurrentTime,
    setPaused,
    setRepeatMode,
    setResumed,
    setShuffled,
    skipToNext,
    skipToPrevious
} from "../../reducers/queue";
import {selectAlbum} from "../../reducers/albumListingRoute";
import {formatDuration} from "../../utils/formatDuration";
import {AlbumArt} from "./AlbumArt";
import {ActiveDotContainer} from "./ActiveDot";
import {FadeOverflow} from "./FadeOverflow";
import {GlobalRoute, setGlobalRoute} from "../../reducers/routing";

interface SongInfoProps {
    track: DbTrack;
    className?: string;
}

const fetchNames = (trackId: number) => invoke(EVENT_GET_NAMES, {trackId});

const SongInfoImpl: FC<SongInfoProps> = props => {
    const dispatch = useAppDispatch();

    const namesAsync = useAsync(fetchNames, [props.track.id]);

    const handleAlbumClick = () => {
        dispatch(selectAlbum(props.track.albumId));
        dispatch(setGlobalRoute(GlobalRoute.albumListing));
    };

    return (
        <FadeOverflow className={props.className}>
            <Heading size="sm" whiteSpace="nowrap" mb={1}>
                {props.track.name}
            </Heading>

            <Text whiteSpace="nowrap">
                {namesAsync.result?.artist}
                {" - "}
                <Link onClick={handleAlbumClick}>
                    {namesAsync.result?.album}
                </Link>
            </Text>
        </FadeOverflow>
    );
};
SongInfoImpl.displayName = "SongInfo";

const SongInfo = chakra(SongInfoImpl);

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

const QueueButtons: FC = () => {
    const dispatch = useAppDispatch();
    const isShuffled = useAppSelector(state => state.queue.shuffled);
    const repeatMode = useAppSelector(state => state.queue.repeatMode);
    const {t} = useTranslation("app");

    const iconButtonProps = {
        isRound: true,
        variant: "ghost"
    };

    const handleToggleShuffle = () => dispatch(setShuffled(!isShuffled));

    const handleRepeatSwitch = () =>
        dispatch(setRepeatMode((repeatMode + 1) % 3));

    return (
        <HStack>
            <ActiveDotContainer isActive={isShuffled} gap={-2}>
                <IconButton
                    {...iconButtonProps}
                    aria-label={t("queueControls.toggleShuffle")}
                    icon={<RiShuffleLine />}
                    onClick={handleToggleShuffle}
                />
            </ActiveDotContainer>
            <ActiveDotContainer
                isActive={repeatMode !== RepeatMode.noRepeat}
                gap={-2}
            >
                <IconButton
                    {...iconButtonProps}
                    aria-label={t("queueControls.switchRepeatMode")}
                    icon={
                        repeatMode === RepeatMode.repeatSong ? (
                            <RiRepeatOneLine />
                        ) : (
                            <RiRepeat2Line />
                        )
                    }
                    onClick={handleRepeatSwitch}
                />
            </ActiveDotContainer>
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

    const playPauseButtonProps = {
        ...iconButtonProps,
        variant: "solid"
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
                    {...playPauseButtonProps}
                    aria-label="Pause"
                    icon={<GrPause {...iconProps} />}
                    isDisabled={!props.canPlayPause}
                    onClick={handlePause}
                />
            ) : (
                <IconButton
                    {...playPauseButtonProps}
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

const MediaControlsImpl: FC = () => {
    const colours = useThemeColours();

    const currentSongId = useAppSelector(state => state.queue.nowPlaying);
    const previousSongsCount = useAppSelector(
        state => state.queue.previousSongs.length
    );
    const nextSongsCount = useAppSelector(
        state => state.queue.playNextSongs.length + state.queue.songs.length
    );
    const isRepeating = useAppSelector(
        state => state.queue.repeatMode !== RepeatMode.noRepeat
    );

    const currentSong = useAsync(getSong, [currentSongId]);

    return (
        <HStack
            p={4}
            pl={0}
            spacing={4}
            background={colours.backgroundL1}
            color={colours.text}
        >
            <Divider orientation="vertical" />

            <SongTracker duration={currentSong.result?.song.duration} />

            <Divider orientation="vertical" />

            <MediaButtons
                canSkipBackwards={previousSongsCount > 0}
                canSkipForwards={nextSongsCount > 0 || isRepeating}
                canPlayPause={currentSongId !== null || nextSongsCount > 0}
            />

            <Divider orientation="vertical" />

            <QueueButtons />
        </HStack>
    );
};
MediaControlsImpl.displayName = "MediaControls";

const SongDisplayImpl: FC = () => {
    const colours = useThemeColours();
    const currentSongId = useAppSelector(state => state.queue.nowPlaying);
    const currentSong = useAsync(getSong, [currentSongId]);

    return (
        <HStack
            color={colours.text}
            p={4}
            backgroundColor={colours.backgroundL1}
        >
            <AlbumArt
                size={16}
                flexShrink={0}
                artPath={currentSong.result?.song.art?.url || defaultAlbumArt}
                avgColour={currentSong.result?.song.art?.avgColour}
            />

            {currentSong.result && (
                <SongInfo track={currentSong.result.song} maxWidth="100%" />
            )}
        </HStack>
    );
};
SongDisplayImpl.displayName = "SongDisplay";

export const MediaControls = chakra(MediaControlsImpl);
export const SongDisplay = chakra(SongDisplayImpl);
