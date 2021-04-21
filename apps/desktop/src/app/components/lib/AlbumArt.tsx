import React, {FC} from "react";
import {chakra, Image} from "@chakra-ui/react";

export interface AlbumArtProps {
    artPath: string;
    className?: string;
}

const AlbumArtImpl: FC<AlbumArtProps> = props => (
    <Image
        className={props.className}
        src={props.artPath}
        borderRadius="md"
        objectFit="cover"
        draggable={false}
    />
);

export const AlbumArt = chakra(AlbumArtImpl);
