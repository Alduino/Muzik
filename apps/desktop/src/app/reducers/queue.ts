import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";
import seedrandom from "seedrandom";
import {
    AlbumSongsRequest,
    AlbumSongsResponse,
    EVENT_ALBUM_SONGS
} from "../../lib/ipc-constants";
import {invoke} from "../../lib/ipc/renderer";

// will restart song instead of going to previous after this many seconds
const RESTART_THRESHOLD = 2;

export enum RepeatMode {
    noRepeat,
    repeatQueue,
    repeatSong
}

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

export const playAlbumAfterNext = createAsyncThunk(
    "queue/playAlbumAfterNext",
    async (id: number) => {
        const album = await invoke(EVENT_ALBUM_SONGS, {
            albumId: id
        });

        return album.songs.map(song => song.id);
    }
);

export const playAlbumNext = createAsyncThunk(
    "queue/playAlbumNext",
    async (id: number) => {
        const album = await invoke(EVENT_ALBUM_SONGS, {
            albumId: id
        });

        return album.songs.map(song => song.id);
    }
);

const rngSeed = Math.round(Date.now());
let rngOffset = 0;

function getShuffleIndex(max: number, increment: boolean, offset = 0): number {
    const seed = rngSeed + rngOffset + offset;
    if (increment) rngOffset++;
    const random = seedrandom(seed.toString());
    const value = random.quick();
    return Math.floor(value * max);
}

interface GetAndRemoveNextSongOpts {
    playNextSongs: number[];
    songs: number[];
    previousSongs: number[];
    shuffled: boolean;
    repeatMode: RepeatMode;
    currentTime: number;
    _currentTimeWasFromAudio: boolean;
    rngIncrement?: boolean;
    rngOffset?: number;
}

export function getAndRemoveNextSong(
    opts: GetAndRemoveNextSongOpts
): number | null {
    const {
        playNextSongs,
        songs,
        previousSongs,
        shuffled,
        repeatMode,
        rngIncrement = true,
        rngOffset = 0
    } = opts;

    if (playNextSongs.length > 0) return playNextSongs.shift();

    if (previousSongs.length > 0) {
        if (repeatMode === RepeatMode.repeatQueue && songs.length === 0) {
            opts._currentTimeWasFromAudio = false;
            opts.currentTime = 0;
            songs.push(...previousSongs);
        } else if (repeatMode === RepeatMode.repeatSong) {
            opts._currentTimeWasFromAudio = false;
            opts.currentTime = 0;
            return previousSongs[previousSongs.length - 1];
        }
    }

    if (!shuffled) return songs.shift() || null;

    // try and pick a song that hasn't already been played
    const recentPreviousSongs = previousSongs.slice(-10);
    const notPlayedSongs = songs.filter(
        it => !recentPreviousSongs.includes(it)
    );

    // if there are no songs that haven't been played, just pick a random one
    const songsToShuffle = notPlayedSongs.length > 0 ? notPlayedSongs : songs;

    const nextSongIndex = getShuffleIndex(
        songsToShuffle.length,
        rngIncrement,
        rngOffset
    );
    const nextSong = songsToShuffle[nextSongIndex];

    // delete the song being played
    const songIndex = songs.indexOf(nextSong);
    songs.splice(songIndex, 1);

    return nextSong || null;
}

export const slice = createSlice({
    name: "queue",
    initialState: {
        playNextSongs: [] as number[],
        songs: [] as number[],
        previousSongs: [] as number[],
        shuffled: false,
        repeatMode: RepeatMode.noRepeat,
        nowPlaying: null as number | null,
        isPlaying: false,
        currentTime: 0,
        _currentTimeWasFromAudio: false
    },
    reducers: {
        clearQueue(state) {
            state.songs = [];
            state.playNextSongs = [];
            state.previousSongs = [];
            state.nowPlaying = null;
        },
        queueSong(state, id: PayloadAction<number>) {
            state.songs.push(id.payload);
        },
        queueSongs(state, ids: PayloadAction<number[]>) {
            state.songs.push(...ids.payload);
        },
        playNext(state, id: PayloadAction<number>) {
            state.playNextSongs.unshift(id.payload);
        },
        playAllNext(state, {payload}: PayloadAction<number[]>) {
            state.playNextSongs.unshift(...payload);
        },
        playAfterNext(state, {payload}: PayloadAction<number>) {
            state.playNextSongs.push(payload);
        },
        playAllAfterNext(state, {payload}: PayloadAction<number[]>) {
            state.playNextSongs.push(...payload);
        },
        shuffle(state) {
            state.shuffled = true;
        },
        setShuffled(state, {payload}: PayloadAction<boolean>) {
            state.shuffled = payload;
        },
        setRepeatMode(state, {payload}: PayloadAction<RepeatMode>) {
            state.repeatMode = payload;
        },
        skipToNext(state) {
            state.currentTime = 0;
            if (state.nowPlaying !== null)
                state.previousSongs.push(state.nowPlaying);
            state.nowPlaying = getAndRemoveNextSong(state);
            state.isPlaying = state.nowPlaying !== null;
        },
        skipToPrevious(state) {
            const oldTime = state.currentTime;

            state.currentTime = 0;
            state._currentTimeWasFromAudio = false;

            if (oldTime < RESTART_THRESHOLD) {
                if (state.nowPlaying !== null)
                    state.playNextSongs.unshift(state.nowPlaying);
                state.nowPlaying = state.previousSongs.pop() || null;
            }

            state.isPlaying = state.nowPlaying !== null;
        },
        setNowPlaying(state, {payload}: PayloadAction<number>) {
            state.nowPlaying = payload;
        },
        begin(state) {
            if (state.nowPlaying !== null)
                state.previousSongs.push(state.nowPlaying);
            state.nowPlaying = getAndRemoveNextSong(state);
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

        builder.addCase(playAlbumAfterNext.fulfilled, (state, action) => {
            state.playNextSongs.push(...action.payload);
        });

        builder.addCase(playAlbumNext.fulfilled, (state, action) => {
            state.playNextSongs.unshift(...action.payload);
        });
    }
});

export const {
    clearQueue,
    queueSong,
    queueSongs,
    playNext,
    playAllNext,
    playAfterNext,
    playAllAfterNext,
    shuffle: shuffleQueue,
    setShuffled,
    setRepeatMode,
    skipToNext,
    skipToPrevious,
    setNowPlaying,
    begin: beginQueue,
    resume: setResumed,
    pause: setPaused,
    stop: cancelPlaying,
    setCurrentTime,
    setCurrentTimeFromAudio
} = slice.actions;
