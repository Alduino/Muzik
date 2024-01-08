import {mdiPlay} from "@mdi/js";
import {ReactElement} from "react";
import {Icon} from "../../components/Icon.tsx";
import {Artwork} from "../../components/artwork";
import useEventHandler from "../../hooks/useEventHandler.ts";
import {trpc} from "../../utils/trpc.ts";
import {playButtonClass, playButtonContainerClass} from "./styles.css.ts";

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
    const mutator = trpc.playback.play.useMutation();

    const handleClick = useEventHandler(() => {
        mutator.mutate({
            trackId
        });
    });

    return (
        <Artwork id={artworkId} placeholderColour={avgColour} size="small">
            <button className={playButtonContainerClass} onClick={handleClick}>
                <Icon
                    icon={mdiPlay}
                    className={playButtonClass}
                    aria-label="Play Track"
                />
            </button>
        </Artwork>
    );
}
