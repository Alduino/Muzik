import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {invoke} from "../../lib/ipc/renderer";
import {
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_SONGS
} from "../../lib/ipc-constants";

// will restart song instead of going to previous after this many seconds
const RESTART_THRESHOLD = 2;

export const queueAlbum = createAsyncThunk(
    "queue/queueAlbum",
    async (id: number) => {
        const album = await invoke<AlbumSongsResponse, AlbumSongsRequest>(
            EVENT_ALBUM_SONGS,
            {
                albumId: id
            }
        );

        return album.songs.map(song => song.id);
    }
);

export const slice = createSlice({
    name: "queue",
    initialState: {
        songs: [] as number[],
        previousSongs: [] as number[],
        nowPlaying: null as number | null,
        isPlaying: false,
        currentTime: 0,
        _currentTimeWasFromAudio: false
    },
    reducers: {
        clearQueue(state) {
            state.songs = [];
        },
        queueSong(state, id: PayloadAction<number>) {
            state.songs.push(id.payload);
        },
        queueSongs(state, ids: PayloadAction<number[]>) {
            state.songs.push(...ids.payload);
        },
        playNext(state, id: PayloadAction<number>) {
            state.songs.unshift(id.payload);
        },
        skipToNext(state) {
            state.currentTime = 0;
            if (state.nowPlaying !== null)
                state.previousSongs.push(state.nowPlaying);
            state.nowPlaying = state.songs.shift() || null;
            state.isPlaying = state.nowPlaying !== null;
        },
        skipToPrevious(state) {
            const oldTime = state.currentTime;

            state.currentTime = 0;
            state._currentTimeWasFromAudio = false;

            if (oldTime < RESTART_THRESHOLD) {
                if (state.nowPlaying !== null)
                    state.songs.unshift(state.nowPlaying);
                state.nowPlaying = state.previousSongs.pop() || null;
            }

            state.isPlaying = state.nowPlaying !== null;
        },
        begin(state) {
            if (state.nowPlaying !== null)
                state.previousSongs.push(state.nowPlaying);
            state.nowPlaying = state.songs.shift() || null;
            state.isPlaying = state.nowPlaying !== null;
        },
        resume(state) {
            state.isPlaying = state.nowPlaying !== null;
        },
        pause(state) {
            state.isPlaying = false;
        },
        stop(state) {
            state.isPlaying = false;
            state.currentTime = 0;
            state._currentTimeWasFromAudio = false;
        },
        setCurrentTime(state, {payload}: PayloadAction<number>) {
            state.currentTime = payload;
            state._currentTimeWasFromAudio = false;
        },
        setCurrentTimeFromAudio(state, {payload}: PayloadAction<number>) {
            state.currentTime = payload;
            state._currentTimeWasFromAudio = true;
        }
    },
    extraReducers: builder => {
        builder.addCase(queueAlbum.fulfilled, (state, action) => {
            state.songs.push(...action.payload);
        });
    }
});

export const {
    clearQueue,
    queueSong,
    queueSongs,
    playNext,
    skipToNext,
    skipToPrevious,
    begin: beginQueue,
    resume: setResumed,
    pause: setPaused,
    stop: cancelPlaying,
    setCurrentTime,
    setCurrentTimeFromAudio
} = slice.actions;
