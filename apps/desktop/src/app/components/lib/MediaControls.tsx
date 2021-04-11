import React, {FC} from "react";
import {HStack, IconButton, Image} from "@chakra-ui/react";
import {GrRewind} from "react-icons/gr";
import {useAsync} from "react-async-hook";
import {FloatingContainer} from "./FloatingContainer";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_SONG} from "../../../lib/ipc-constants";
import {GrFastForward, GrPause, GrPlay} from "react-icons/all";
import useThemeColours from "../../hooks/useThemeColours";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import {
    beginQueue,
    setPaused,
    setResumed,
    skipToNext,
    skipToPrevious
} from "../../reducers/queue";

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
    const currentTime = useAppSelector(state => state.queue.currentTime);

    const currentSong = useAsync(getSong, [currentSongId]);

    return (
        <FloatingContainer width="full" h={24}>
            <HStack p={4} gap={8} height="full">
                <AlbumArt
                    artPath={
                        currentSong.result?.song.album.art?.path ||
                        defaultAlbumArt
                    }
                />

                <MediaButtons
                    canSkipBackwards={previousSongsCount > 0}
                    canSkipForwards={nextSongsCount > 0}
                    canPlayPause={currentSongId !== null}
                />
            </HStack>
        </FloatingContainer>
    );
};
