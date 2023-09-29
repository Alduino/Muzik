import {assignInlineVars} from "@vanilla-extract/dynamic";
import {useMemo} from "react";
import {useInView} from "react-intersection-observer";
import {useBoolean} from "../../hooks/useBoolean.ts";
import {trpc} from "../../utils/trpc.ts";
import {
    containerClass,
    imageStyle,
    placeholderColourVar,
    sizeVar
} from "./styles.css.ts";

function getImageSourceUrl(sourceId: number) {
    return `image-source://${sourceId}`;
}

const SIZES = {
    small: 48
};

export interface ArtworkProps {
    id: number;
    placeholderColour: string;
    size: keyof typeof SIZES;
}

export function Artwork({id, placeholderColour, size: sizeKey}: ArtworkProps) {
    const {ref, inView} = useInView();

    const {data} = trpc.artwork.imageSource.useQuery(
        {
            artworkId: id
        },
        {
            enabled: inView
        }
    );

    const size = SIZES[sizeKey];

    const sourceId = useMemo(() => {
        if (!data) return null;

        const sourcesWithEnoughResolution = data.filter(
            source => source.width > size && source.height > size
        );

        if (sourcesWithEnoughResolution.length > 0) {
            return sourcesWithEnoughResolution[0].id;
        } else {
            let highestMinimumDimension = 0,
                bestSourceId: number | null = null;

            for (const source of data) {
                const minimumDimension = Math.min(source.width, source.height);

                if (minimumDimension > highestMinimumDimension) {
                    highestMinimumDimension = minimumDimension;
                    bestSourceId = source.id;
                }
            }

            return bestSourceId;
        }
    }, [data, size]);

    const [loaded, setLoaded] = useBoolean(false);

    return (
        <div
            ref={ref}
            className={containerClass}
            style={assignInlineVars({
                [placeholderColourVar]: placeholderColour,
                [sizeVar]: `${size}px`
            })}
        >
            {sourceId && (
                <img
                    className={imageStyle({loaded})}
                    src={getImageSourceUrl(sourceId)}
                    alt=""
                    onLoad={setLoaded.on}
                />
            )}
        </div>
    );
}
