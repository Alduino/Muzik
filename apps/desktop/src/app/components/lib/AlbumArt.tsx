import React, {FC, useEffect, useState} from "react";
import {Box, Center, chakra, Image, Spinner} from "@chakra-ui/react";
import useThemeColours from "../../hooks/useThemeColours";

export interface AlbumArtProps {
    size: number | string;
    artPath: string;
    avgColour?: string;
    className?: string;
}

const AlbumArtImpl: FC<AlbumArtProps> = props => {
    const [opacity, setOpacity] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (loaded || !!props.avgColour) setOpacity(1);
    }, [loaded, props.avgColour]);

    return (
        <Box
            position="relative"
            borderRadius="md"
            width={props.size}
            height={props.size}
            background={props.avgColour}
            transition="opacity .2s"
            opacity={opacity}
            className={props.className}
        >
            <Image
                src={props.artPath}
                width="100%"
                height="100%"
                objectFit="cover"
                draggable={false}
                onLoad={() => setLoaded(true)}
            />
            {props.children && (
                <Box position="absolute" top={0} left={0} bottom={0} right={0}>
                    {props.children}
                </Box>
            )}
        </Box>
    );
};
AlbumArtImpl.displayName = "AlbumArt";

export const AlbumArt = chakra(AlbumArtImpl);
