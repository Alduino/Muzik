import {FC, useEffect, useState} from "react";
import {
    EVENT_APP_STATE_GET,
    EVENT_APP_STATE_SET
} from "../../../lib/ipc-constants";
import {invoke} from "../../../lib/ipc/renderer";
import {setVolume} from "../../reducers/media";
import {
    playAllNext,
    queueSongs,
    setNowPlaying,
    setRepeatMode,
    setShuffled
} from "../../reducers/queue";
import {setAlbumArtSize, setGlobalRoute} from "../../reducers/routing";
import {useAppDispatch, useAppSelector} from "../../store-hooks";

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
    const volume = useAppSelector(state => state.media.volume);

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
            dispatch(setVolume(state.volume ?? 1));
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
            albumArtIsLarge,
            volume
        });
    }, [
        loaded,
        shuffled,
        nowPlaying,
        repeatMode,
        route,
        albumArtIsLarge,
        volume
    ]);

    return null;
};
