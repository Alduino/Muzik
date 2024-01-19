import {mdiPlay} from "@mdi/js";
import {ReactElement} from "react";
import {Icon} from "../../components/Icon.tsx";
import {Artwork} from "../../components/artwork";
import useEventHandler from "../../hooks/useEventHandler.ts";
import {useSubscriptionState} from "../../hooks/useSubscriptionState.ts";
import {trpc} from "../../utils/trpc.ts";
import {
    frequencyVisualiserContainerClass,
    frequencyVisualizerClass,
    playButtonClass,
    playButtonContainerClass
} from "./ArtworkPlayButton.css.ts";
import {FrequencyVisualiser} from "../../components/FrequencyVisualiser.tsx";
import {colour} from "../../theme/colour.ts";

export interface ArtworkPlayButtonProps {
    trackId: number;
    artworkId: number | null;
    avgColour: string;
}

export function ArtworkPlayButton({
                                      trackId,
                                      artworkId,
                                      avgColour
                                  }: ArtworkPlayButtonProps): ReactElement {
    const currentTrackId = useSubscriptionState(trpc.playback.getCurrentTrack$, undefined, null);
    const anyTrackPlaying = useSubscriptionState(trpc.playback.isPlaying$, undefined, false);
    const thisTrackIsPlaying = anyTrackPlaying && currentTrackId === trackId;

    const mutator = trpc.playback.play.useMutation();

    const handleClick = useEventHandler(() => {
        mutator.mutate({
            trackId
        });
    });

    return (
        <Artwork id={artworkId} placeholderColour={avgColour} size="small">
            {thisTrackIsPlaying ? (
                <div className={frequencyVisualiserContainerClass}>
                    <FrequencyVisualiser className={frequencyVisualizerClass} barCount={3} widthToGapRatio={.8}
                                         fillColour={colour("blue", 40)} />
                </div>
            ) : (
                <button className={playButtonContainerClass} onClick={handleClick}>
                    <Icon
                        icon={mdiPlay}
                        className={playButtonClass}
                        aria-label="Play Track"
                    />
                </button>
            )}
        </Artwork>
    );
}
