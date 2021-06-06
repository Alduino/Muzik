import {Center, chakra} from "@chakra-ui/react";
import React from "react";
import {AlbumArt} from "./AlbumArt";
import {PlayButton} from "./PlayButton";

export interface PlayButtonAlbumArtProps {
    isHovered: boolean;
    isCurrent: boolean;
    artPath: string;
    artSize: string | number;
    unloadedBackground?: string;
    buttonSize: string;
    transitionTime?: string;
    className?: string;
    onPlay?(): void;
}

/**
 * Album art with an play button overlay while hovered
 */
export const PlayButtonAlbumArt = chakra((props: PlayButtonAlbumArtProps) => (
    <AlbumArt
        flexShrink={0}
        flexGrow={0}
        size={props.artSize}
        artPath={props.artPath}
        unloadedBackground={props.unloadedBackground}
        className={props.className}
    >
        <Center
            bg="#0006"
            height="full"
            transition="100ms"
            opacity={props.isHovered ? 1 : 0}
        >
            <PlayButton
                size={props.buttonSize}
                isCurrent={props.isCurrent}
                onPlay={props.onPlay}
            />
        </Center>
    </AlbumArt>
));
PlayButtonAlbumArt.displayName = "PlayButtonAlbumArt";
