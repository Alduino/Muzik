import {assignInlineVars, setElementVars} from "@vanilla-extract/dynamic";
import {ReactElement, useCallback, useEffect, useState} from "react";
import {AlbumArt} from "../../components/lib/AlbumArt";
import {useVisualiser} from "../../components/lib/AudioController";
import useAlbumArt from "../../hooks/useAlbumArt";
import {useNames} from "../../rpc";
import {useAppSelector} from "../../store-hooks";
import {
    centerContainerClass,
    containerClass,
    dividerClass,
    songInfoContainer,
    songNamesContainer,
    trackTitleClass,
    visualiserBarClass,
    visualiserBarCount,
    visualiserContainerClass,
    visualiserHeightVar
} from "./styles.css";

export function Cinema(): ReactElement {
    const currentTrackId = useAppSelector(state => state.queue.nowPlaying);
    const albumArtProps = useAlbumArt(currentTrackId);

    const {data: names} = useNames(currentTrackId);

    return (
        <div className={containerClass}>
            <div className={centerContainerClass}>
                <div className={songInfoContainer}>
                    <AlbumArt {...albumArtProps} size={512} />
                    {names && (
                        <div className={songNamesContainer}>
                            <span className={trackTitleClass}>
                                {names.track}
                            </span>
                            <span>{names.artist}</span>
                        </div>
                    )}
                </div>
                <div className={dividerClass} />
            </div>
            <Visualiser />
        </div>
    );
}

function Visualiser() {
    const barCount = 24;

    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [bars, setBars] = useState<HTMLDivElement[]>([]);

    useEffect(() => {
        if (!container) return;

        const bars = Array.from({length: barCount}, (_, i) => {
            const bar = document.createElement("div");
            bar.className = visualiserBarClass;
            container.appendChild(bar);
            return bar;
        });

        setBars(bars);

        return () => {
            bars.forEach(bar => bar.remove());
        };
    }, [container, barCount]);

    const handleUpdate = useCallback(
        (heights: number[]) => {
            for (let i = 0; i < barCount; i++) {
                if (i >= heights.length || i >= bars.length) break;

                const bar = bars[i];
                const height = heights[i];

                setElementVars(bar, {
                    [visualiserHeightVar]: height.toFixed(2)
                });
            }
        },
        [bars]
    );

    useVisualiser(barCount, handleUpdate);

    return (
        <div
            className={visualiserContainerClass}
            ref={setContainer}
            style={assignInlineVars({
                [visualiserBarCount]: barCount.toString()
            })}
        />
    );
}
