import {FC, useEffect, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_SONG} from "../../../lib/ipc-constants";
import {useAsync} from "react-async-hook";

const getCurrentSong = (songId: number) => invoke(EVENT_GET_SONG, {songId});

export const TitleController: FC = () => {
    const {t} = useTranslation("app");
    const currentlyPlaying = useAppSelector(v => v.queue.nowPlaying);
    const currentSongAsync = useAsync(getCurrentSong, [currentlyPlaying]);

    const titleElement = useMemo(
        () => document.getElementById("html-title"),
        []
    );

    useEffect(() => {
        if (currentSongAsync.result?.song) {
            const {song} = currentSongAsync.result;
            titleElement.textContent = t("title.playing", {
                artist: song.album.artist.name,
                track: song.name
            });
        } else {
            titleElement.textContent = t("title.normal");
        }
    }, [currentSongAsync.result]);

    return null;
};
