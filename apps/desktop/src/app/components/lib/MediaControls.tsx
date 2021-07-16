import {
    Box,
    chakra,
    Divider,
    Flex,
    Heading,
    HStack,
    Icon,
    IconButton,
    Link,
    ScaleFade,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Text,
    useBoolean,
    useDisclosure,
    useToken
} from "@chakra-ui/react";
import React, {
    FC,
    ReactElement,
    useCallback,
    useMemo,
    useRef,
    useState
} from "react";
import {useTranslation} from "react-i18next";
import {BiChevronDown, BiChevronUp} from "react-icons/bi";
import {GrFastForward, GrPause, GrPlay, GrRewind} from "react-icons/gr";
import {
    ImVolumeHigh,
    ImVolumeLow,
    ImVolumeMedium,
    ImVolumeMute2
} from "react-icons/im";
import {RiRepeat2Line, RiRepeatOneLine, RiShuffleLine} from "react-icons/ri";
import {Arrow, useLayer} from "react-laag";
import useAlbumArt from "../../hooks/useAlbumArt";
import useThemeColours from "../../hooks/useThemeColours";
import {selectAlbum} from "../../reducers/albumListingRoute";
import {setVolume} from "../../reducers/media";
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
import {
    GlobalRoute,
    setAlbumArtSize,
    setGlobalRoute
} from "../../reducers/routing";
import {useNames, useTrack} from "../../rpc";
import useMediaBarConfiguration from "../../rpc/useMediaBarConfiguration";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {formatDuration} from "../../utils/formatDuration";
import {ActiveDotContainer} from "./ActiveDot";
import {AlbumArt} from "./AlbumArt";
import {FadeOverflow} from "./FadeOverflow";

interface SongInfoProps {
    trackId: number;
    className?: string;
}

const SongInfoImpl = ({trackId, className}: SongInfoProps) => {
    const dispatch = useAppDispatch();

    const {data: track} = useTrack(trackId);
    const {data: names} = useNames(trackId);

    const handleAlbumClick = () => {
        dispatch(selectAlbum(track.albumId));
        dispatch(setGlobalRoute(GlobalRoute.albumListing));
    };

    return (
        <FadeOverflow className={className}>
            <Heading size="sm" whiteSpace="nowrap" mb={1}>
                {names?.track ?? "Nothing is playing"}
            </Heading>

            {names && (
                <Text whiteSpace="nowrap">
                    {names.artist}
                    {" - "}
                    <Link onClick={handleAlbumClick}>{names.album}</Link>
                </Text>
            )}
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

const VolumeButton = (): ReactElement => {
    const {t} = useTranslation("app");

    const dispatch = useAppDispatch();
    const volume = useAppSelector(state => state.media.volume);

    const colours = useThemeColours();
    const backgroundValue = useToken("colors", colours.backgroundL3);

    const {data: mediaBarConfig} = useMediaBarConfiguration();
    const isMediaBarOnTop = mediaBarConfig?.position !== "bottom";

    const boxRef = useRef<HTMLDivElement>();

    const {isOpen, onOpen, onClose} = useDisclosure();
    const [sliderFocused, setSliderFocused] = useBoolean();

    const {renderLayer, triggerProps, layerProps, arrowProps} = useLayer({
        isOpen,
        placement: isMediaBarOnTop ? "bottom-center" : "top-center"
    });

    const handleSliderLeave = useCallback(() => {
        onClose();
    }, [onClose]);

    const {handleSliderEnter, handleButtonLeave} = useMemo(() => {
        let timeout: NodeJS.Timeout;

        function handleSliderEnter() {
            clearTimeout(timeout);
        }

        function handleButtonLeave() {
            timeout = setTimeout(() => onClose(), 200);
        }

        return {handleSliderEnter, handleButtonLeave};
    }, [onClose]);

    const handleVolumeChange = useCallback(
        (vol: number) => {
            dispatch(setVolume(vol));
        },
        [dispatch]
    );

    const handleSliderBlur = useCallback(() => {
        setSliderFocused.off();
        onClose();
    }, [setSliderFocused, onClose]);

    const handleToggleMute = () => dispatch(setVolume(-volume));

    const volumeIcon =
        volume <= 0
            ? ImVolumeMute2
            : volume < 0.5
            ? ImVolumeLow
            : volume < 1
            ? ImVolumeMedium
            : ImVolumeHigh;
    return (
        <>
            <IconButton
                {...triggerProps}
                onClick={handleToggleMute}
                onMouseEnter={onOpen}
                onMouseLeave={handleButtonLeave}
                isRound={true}
                variant="ghost"
                aria-label={t("queueControls.volume")}
                icon={<Icon as={volumeIcon} />}
            />
            {renderLayer(
                <ScaleFade {...layerProps} initialScale={0.9} in={isOpen}>
                    <Box
                        ref={boxRef}
                        onMouseEnter={handleSliderEnter}
                        onMouseLeave={
                            sliderFocused ? undefined : handleSliderLeave
                        }
                        p={4}
                        pt={5}
                        borderRadius="md"
                        shadow="md"
                        bg={colours.backgroundL3}
                        style={{
                            pointerEvents: isOpen ? "auto" : "none"
                        }}
                    >
                        <Slider
                            onChange={handleVolumeChange}
                            aria-label={t("queueControls.volume")}
                            value={Math.abs(volume)}
                            step={0.02}
                            min={0}
                            max={1}
                            orientation="vertical"
                            minHeight="20"
                            onFocus={setSliderFocused.on}
                            onBlur={handleSliderBlur}
                        >
                            <SliderTrack>
                                <SliderFilledTrack />
                            </SliderTrack>
                            <SliderThumb />
                        </Slider>

                        <Arrow
                            {...arrowProps}
                            backgroundColor={backgroundValue}
                        />
                    </Box>
                </ScaleFade>
            )}
        </>
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
            <VolumeButton />
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

const MediaControlsImpl: FC = () => {
    const colours = useThemeColours();

    const currentTrackId = useAppSelector(state => state.queue.nowPlaying);
    const previousSongsCount = useAppSelector(
        state => state.queue.previousSongs.length
    );
    const nextSongsCount = useAppSelector(
        state => state.queue.playNextSongs.length + state.queue.songs.length
    );
    const isRepeating = useAppSelector(
        state => state.queue.repeatMode !== RepeatMode.noRepeat
    );

    const {data: currentTrack} = useTrack(currentTrackId);

    return (
        <HStack
            p={4}
            pl={0}
            spacing={4}
            background={colours.backgroundL0}
            color={colours.text}
        >
            <Divider orientation="vertical" />

            <SongTracker duration={currentTrack?.duration} />

            <Divider orientation="vertical" />

            <MediaButtons
                canSkipBackwards={previousSongsCount > 0}
                canSkipForwards={nextSongsCount > 0 || isRepeating}
                canPlayPause={currentTrackId !== null || nextSongsCount > 0}
            />

            <Divider orientation="vertical" />

            <QueueButtons />
        </HStack>
    );
};
MediaControlsImpl.displayName = "MediaControls";

const SongDisplayImpl: FC = () => {
    const colours = useThemeColours();
    const dispatch = useAppDispatch();
    const currentTrackId = useAppSelector(state => state.queue.nowPlaying);
    const albumArtIsLarge = useAppSelector(
        state => state.routing.albumArtIsLarge
    );

    const albumArt = useAlbumArt(currentTrackId);

    const {data: mediaBarConfig} = useMediaBarConfiguration();
    const isMediaBarOnTop = mediaBarConfig?.position !== "bottom";

    const handleAlbumArtExpand = useCallback(() => {
        dispatch(setAlbumArtSize(true));
    }, [dispatch]);

    return (
        <Box
            position="relative"
            overflow="hidden"
            color={colours.text}
            p={4}
            backgroundColor={colours.backgroundL0}
        >
            <SongInfo
                position="absolute"
                left={albumArtIsLarge ? "1rem" : "5.5rem"}
                top="1.7rem"
                transition=".4s"
                zIndex={0}
                width={albumArtIsLarge ? "15rem" : "10.5rem"}
                trackId={currentTrackId}
            />

            <AlbumArt
                size={16}
                borderRadius={0}
                transition=".4s"
                position="relative"
                zIndex={1}
                flexShrink={0}
                top={albumArtIsLarge ? (isMediaBarOnTop ? 16 : -16) : 0}
                opacity={albumArtIsLarge ? 0 : 1}
                {...albumArt}
            >
                <Flex p={2} direction="column" height="full" alignItems="start">
                    {isMediaBarOnTop && <Box flexGrow={1} />}
                    <IconButton
                        aria-label="Expand"
                        as={isMediaBarOnTop ? BiChevronDown : BiChevronUp}
                        size="sm"
                        bg="black"
                        color="white"
                        isRound={true}
                        opacity={0}
                        cursor="pointer"
                        _groupHover={{"&:not(:hover)": {opacity: 0.4}}}
                        _hover={{opacity: 0.6}}
                        _active={{background: "black", opacity: 1}}
                        onClick={handleAlbumArtExpand}
                    />
                </Flex>
            </AlbumArt>
        </Box>
    );
};
SongDisplayImpl.displayName = "SongDisplay";

export const MediaControls = chakra(MediaControlsImpl);
export const SongDisplay = chakra(SongDisplayImpl);
