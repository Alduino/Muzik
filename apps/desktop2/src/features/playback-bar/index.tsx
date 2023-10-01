import clsx from "clsx";
import {Fragment, ReactElement} from "react";
import {Artwork} from "../../components/artwork";
import {useCurrentTrack} from "../../hooks/data/useCurrentTrack.ts";
import {trpc} from "../../utils/trpc.ts";
import {
    artistLinkClass,
    artistNameClass,
    containerClass,
    metadataContainerClass,
    trackTitleClass
} from "./styles.css.ts";
import {WaveformSeekBar} from "./waveform-seek-bar";

export interface PlaybackBarProps {
    className?: string;
}

export function PlaybackBar({
    className
}: PlaybackBarProps): ReactElement | null {
    const currentTrack = useCurrentTrack();

    const {data: trackInfo} = trpc.tracks.getTrackInfo.useQuery(
        {
            trackId: currentTrack as number
        },
        {
            enabled: Boolean(currentTrack)
        }
    );

    if (!currentTrack) return null;

    return (
        <div className={clsx(containerClass, className)}>
            {trackInfo && (
                <>
                    {trackInfo.artwork && (
                        <Artwork
                            id={trackInfo.artwork.id}
                            placeholderColour={trackInfo.artwork.avgColour}
                            size="medium"
                        />
                    )}
                    <div className={metadataContainerClass}>
                        <span
                            className={trackTitleClass}
                            title={trackInfo.name}
                        >
                            {trackInfo.name}
                        </span>
                        <span className={artistNameClass}>
                            {trackInfo.artists.map((artist, i) => (
                                <Fragment key={artist.id}>
                                    {i > 0 && ", "}
                                    <a
                                        className={artistLinkClass}
                                        title={artist.name}
                                        href="#"
                                    >
                                        {artist.name}
                                    </a>
                                </Fragment>
                            ))}
                        </span>
                    </div>
                    <WaveformSeekBar />
                </>
            )}
        </div>
    );
}
