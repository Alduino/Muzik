import React, {FC} from "react";
import {Box, chakra, Image} from "@chakra-ui/react";

export interface AlbumArtProps {
    size: number | string;
    artPath: string;
    className?: string;
}

const AlbumArtImpl: FC<AlbumArtProps> = props => (
    <Box
        position="relative"
        borderRadius="md"
        width={props.size}
        height={props.size}
        className={props.className}
    >
        <Image
            src={props.artPath}
            width="100%"
            height="100%"
            objectFit="cover"
            draggable={false}
        />
        {props.children && (
            <Box position="absolute" top={0} left={0} bottom={0} right={0}>
                {props.children}
            </Box>
        )}
    </Box>
);

export const AlbumArt = chakra(AlbumArtImpl);
