import defaultAlbumArt from "../assets/default-album-art.svg";
import {AlbumArtProps} from "../components/lib/AlbumArt";
import {useTrack} from "../rpc";

export default function useAlbumArt(
    songId: number
): Omit<AlbumArtProps, "size" | "className"> {
    const {data: song} = useTrack(songId);
    const artPath = song?.art?.url ?? defaultAlbumArt;
    const unloadedBackground = song?.art?.avgColour;
    return {artPath, unloadedBackground};
}
