import {FC, useEffect, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {EVENT_GET_NAMES} from "../../../lib/ipc-constants";
import {useAsync} from "react-async-hook";

const getCurrentSong = (trackId: number) => invoke(EVENT_GET_NAMES, {trackId});

export const TitleController: FC = () => {
    const {t} = useTranslation("app");
    const currentlyPlaying = useAppSelector(v => v.queue.nowPlaying);
    const names = useAsync(getCurrentSong, [currentlyPlaying]);

    const titleElement = useMemo(
        () => document.getElementById("html-title"),
        []
    );

    useEffect(() => {
        if (names.result) {
            titleElement.textContent = t("title.playing", {
                artist: names.result.artist,
                track: names.result.track
            });
        } else {
            titleElement.textContent = t("title.normal");
        }
    }, [names.result]);

    return null;
};
