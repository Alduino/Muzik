import {FC, useEffect, useState} from "react";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {invoke} from "../../../lib/ipc/renderer";
import {
    playAllNext,
    queueSongs,
    setNowPlaying,
    setRepeatMode,
    setShuffled
} from "../../reducers/queue";
import {
    EVENT_APP_STATE_GET,
    EVENT_APP_STATE_SET
} from "../../../lib/ipc-constants";
import {setAlbumArtSize, setGlobalRoute} from "../../reducers/routing";

export const StoreSaver: FC = () => {
    const dispatch = useAppDispatch();
    const shuffled = useAppSelector(state => state.queue.shuffled);
    const repeatMode = useAppSelector(state => state.queue.repeatMode);
    const nowPlaying = useAppSelector(state => state.queue.nowPlaying);
    const upNext = useAppSelector(state => state.queue.playNextSongs);
    const songs = useAppSelector(state => state.queue.songs);
    const route = useAppSelector(state => state.routing.globalRoute);
    const albumArtIsLarge = useAppSelector(
        state => state.routing.albumArtIsLarge
    );

    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        invoke(EVENT_APP_STATE_GET).then(state => {
            setLoaded(true);
            if (!state) return;
            dispatch(setShuffled(state.shuffled));
            dispatch(setRepeatMode(state.repeatMode));
            dispatch(setNowPlaying(state.nowPlaying));
            dispatch(playAllNext(state.upNext));
            dispatch(queueSongs(state.songs || []));
            dispatch(setGlobalRoute(state.route || 0));
            dispatch(setAlbumArtSize(state.albumArtIsLarge));
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        invoke(EVENT_APP_STATE_SET, {
            shuffled,
            repeatMode,
            nowPlaying,
            upNext,
            songs,
            route,
            albumArtIsLarge
        });
    }, [loaded, shuffled, nowPlaying, repeatMode, route, albumArtIsLarge]);

    return null;
};
