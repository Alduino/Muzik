import {Box, IconButton} from "@chakra-ui/react";
import React, {FC, ReactElement} from "react";
import {useSelector} from "react-redux";
import {GrPause, GrPlay, GrResume} from "react-icons/gr";
import {RootState} from "../../reducers/root";
import {useAppDispatch} from "../../store";
import {setPaused, setResumed} from "../../reducers/queue";
import {VisualiserIcon} from "./AudioController";

interface UsePlayButtonIconResult {
    isVisible: boolean;
    icon: ReactElement | null;
}

function usePlayButtonIcon(
    isCurrent: boolean,
    isHovered: boolean
): UsePlayButtonIconResult {
    const isPlaying = useSelector<RootState, boolean>(v => v.queue.isPlaying);

    const baseResult = {
        isVisible: isHovered
    };

    const iconProps = {
        style: {
            filter: "invert()"
        }
    };

    if (isCurrent) {
        if (isPlaying) {
            if (isHovered) {
                return {
                    ...baseResult,
                    icon: <GrPause {...iconProps} />
                };
            } else {
                return {
                    ...baseResult,
                    isVisible: true,
                    icon: (
                        <Box p={3} width="full" height="full" grow={1}>
                            <VisualiserIcon bands={3} />
                        </Box>
                    )
                };
            }
        } else if (isHovered) {
            return {
                ...baseResult,
                icon: <GrResume {...iconProps} />
            };
        }
    } else {
        if (isHovered) {
            return {
                ...baseResult,
                icon: <GrPlay {...iconProps} />
            };
        }
    }

    return {
        ...baseResult,
        icon: null
    };
}

export interface PlayButtonProps {
    size: string;
    isCurrent: boolean;
    isHovered: boolean;

    onPlay?: () => void;
}

export const PlayButton: FC<PlayButtonProps> = props => {
    const isPlaying = useSelector<RootState, boolean>(v => v.queue.isPlaying);
    const isStopped = useSelector<RootState, boolean>(
        v => v.queue.nowPlaying === null
    );
    const dispatch = useAppDispatch();

    const {icon, isVisible} = usePlayButtonIcon(
        props.isCurrent,
        props.isHovered
    );

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
            opacity={isVisible ? 1 : 0}
            aria-label="Play"
            icon={icon}
            onClick={handleClick}
        />
    );
};