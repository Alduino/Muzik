import {FC, useEffect, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useNames} from "../../rpc";
import {useAppSelector} from "../../store-hooks";

export const TitleController: FC = () => {
    const {t} = useTranslation("app");
    const currentlyPlaying = useAppSelector(v => v.queue.nowPlaying);
    const {data: names} = useNames(currentlyPlaying);

    const titleElement = useMemo(
        () => document.getElementById("html-title"),
        []
    );

    useEffect(() => {
        if (names) {
            titleElement.textContent = t("title.playing", {
                artist: names.artist,
                track: names.track
            });
        } else {
            titleElement.textContent = t("title.normal");
        }
    }, [names]);

    return null;
};
