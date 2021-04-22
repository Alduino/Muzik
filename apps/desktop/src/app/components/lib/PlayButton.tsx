import {IconButton} from "@chakra-ui/react";
import React, {FC, ReactElement} from "react";
import {GrPause, GrPlay, GrResume} from "react-icons/gr";
import {setPaused, setResumed} from "../../reducers/queue";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import useThemeColours from "../../hooks/useThemeColours";

interface UsePlayButtonIconResult {
    icon: ReactElement | null;
}

function usePlayButtonIcon(isCurrent: boolean): UsePlayButtonIconResult {
    const colours = useThemeColours();
    const isPlaying = useAppSelector(v => v.queue.isPlaying);

    const iconProps = {
        ...colours.invertThemeReverse
    };

    if (isCurrent) {
        if (isPlaying) {
            return {
                icon: <GrPause {...iconProps} />
            };
        } else {
            return {
                icon: <GrResume {...iconProps} />
            };
        }
    } else {
        return {
            icon: <GrPlay {...iconProps} />
        };
    }
}

export interface PlayButtonProps {
    size: string;
    isCurrent: boolean;

    onPlay?: () => void;
}

export const PlayButton: FC<PlayButtonProps> = props => {
    const isPlaying = useAppSelector(v => v.queue.isPlaying);
    const isStopped = useAppSelector(v => v.queue.nowPlaying === null);
    const dispatch = useAppDispatch();

    const {icon} = usePlayButtonIcon(props.isCurrent);

    const handleClick = () => {
        if (!props.isCurrent || (isStopped && !isPlaying)) {
            props.onPlay();
        } else {
            if (isPlaying) {
                dispatch(setPaused());
            } else {
                dispatch(setResumed());
            }
        }
    };

    return (
        <IconButton
            size={props.size}
            variant="solid"
            colorScheme="blue"
            overflow="hidden"
            isRound
            aria-label="Play"
            icon={icon}
            onClick={handleClick}
        />
    );
};
