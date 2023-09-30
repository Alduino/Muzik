import {assignInlineVars} from "@vanilla-extract/dynamic";
import {memo, ReactElement, ReactNode, useMemo} from "react";
import {useBoolean} from "../../hooks/useBoolean.ts";
import {trpc} from "../../utils/trpc.ts";
import {
    childrenContainerClass,
    containerClass,
    imageStyle,
    placeholderColourVar,
    sizeVar
} from "./styles.css.ts";

function getImageSourceUrl(sourceId: number, minDimension: number) {
    return `image-source://images.com/${sourceId}?mind=${minDimension}`;
}

const SIZES = {
    small: 48,
    medium: 64
};

interface ArtworkImageProps {
    id: number;
    size: number;
}

function ArtworkImage({id, size}: ArtworkImageProps): ReactElement | null {
    const {data} = trpc.artwork.imageSource.useQuery({
        artworkId: id
    });

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

    if (!sourceId) return null;

    return (
        <img
            className={imageStyle({loaded})}
            src={getImageSourceUrl(sourceId, size)}
            alt=""
            onLoad={setLoaded.on}
        />
    );
}

const MemoisedArtworkImage = memo(ArtworkImage, (prev, next) => {
    return prev.id === next.id && prev.size === next.size;
});

export interface ArtworkProps {
    id: number;
    placeholderColour: string;
    size: keyof typeof SIZES;

    // Allows e.g. a play button to be rendered on top of the artwork
    children?: ReactNode;
}

export function Artwork({
    id,
    placeholderColour,
    size: sizeKey,
    children
}: ArtworkProps) {
    const size = SIZES[sizeKey];

    return (
        <div
            className={containerClass}
            style={assignInlineVars({
                [placeholderColourVar]: placeholderColour,
                [sizeVar]: `${size}px`
            })}
        >
            <MemoisedArtworkImage id={id} size={size} />

            {children && (
                <div className={childrenContainerClass}>{children}</div>
            )}
        </div>
    );
}
