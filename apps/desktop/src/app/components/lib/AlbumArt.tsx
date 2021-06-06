import {Box, chakra, Image} from "@chakra-ui/react";
import React, {FC, useEffect, useState} from "react";

export interface AlbumArtProps {
    size: number | string;
    artPath: string;
    unloadedBackground?: string;
    className?: string;
}

const AlbumArtImpl: FC<AlbumArtProps> = props => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => setLoaded(false), [props.artPath]);

    return (
        <Box
            position="relative"
            width={props.size}
            height={props.size}
            background={props.unloadedBackground}
            opacity={props.unloadedBackground || loaded ? 1 : 0}
            transition="opacity .2s"
            role="group"
            className={props.className}
        >
            <Image
                src={props.artPath}
                width="100%"
                height="100%"
                transition="opacity .2s"
                objectFit="cover"
                draggable={false}
                opacity={loaded ? 1 : 0}
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
