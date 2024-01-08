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

const defaultImageUrl = new URL("../../assets/default-album-art.svg", import.meta.url);

function getImageSourceUrl(sourceId: number, minDimension: number) {
    return `image-source://images.com/${sourceId}?mind=${minDimension}`;
}

const SIZES = {
    small: 48,
    medium: 64
};

interface ArtworkImageProps {
    id: number | null;
    size: number;
}

function ArtworkImage({id, size}: ArtworkImageProps): ReactElement | null {
    const {data} = trpc.artwork.imageSource.useQuery({
        artworkId: id as number
    }, {
        enabled: id !== null
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

    if (!sourceId) {
        return (
            <img
                className={imageStyle({loaded: true})}
                src={defaultImageUrl.toString()}
                alt=""
            />
        )
    }

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
    id: number | null;
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
