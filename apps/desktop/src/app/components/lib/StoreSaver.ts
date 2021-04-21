import {FC, useEffect, useState} from "react";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {
    queueSongs,
    setNowPlaying,
    setRepeatMode,
    setShuffled
} from "../../reducers/queue";
import {
    EVENT_APP_STATE_GET,
    EVENT_APP_STATE_SET
} from "../../../lib/ipc-constants";

export const StoreSaver: FC = () => {
    const dispatch = useAppDispatch();
    const shuffled = useAppSelector(state => state.queue.shuffled);
    const repeatMode = useAppSelector(state => state.queue.repeatMode);
    const nowPlaying = useAppSelector(state => state.queue.nowPlaying);
    const songs = useAppSelector(state => state.queue.songs);

    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        invoke(EVENT_APP_STATE_GET).then(state => {
            setLoaded(true);
            if (!state) return;
            dispatch(setShuffled(state.shuffled));
            dispatch(setRepeatMode(state.repeatMode));
            dispatch(setNowPlaying(state.nowPlaying));
            dispatch(queueSongs(state.songs));
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        invoke(EVENT_APP_STATE_SET, {
            shuffled,
            repeatMode,
            nowPlaying,
            songs
        });
    }, [loaded, shuffled, nowPlaying, repeatMode]);

    return null;
};
