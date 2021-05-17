import {AlbumArtProps} from "../components/lib/AlbumArt";
import {useAsync} from "react-async-hook";
import {invoke} from "../../lib/ipc/renderer";
import {EVENT_GET_SONG} from "../../lib/ipc-constants";
import defaultAlbumArt from "../assets/default-album-art.svg";

const fetchSong = (songId: number) => invoke(EVENT_GET_SONG, {songId});

export default function useAlbumArt(
    songId: number
): Omit<AlbumArtProps, "size" | "className"> {
    const {result} = useAsync(fetchSong, [songId]);
    const artPath = result?.song.art?.url ?? defaultAlbumArt;
    const avgColour = result?.song.art?.avgColour;
    return {artPath, avgColour};
}
