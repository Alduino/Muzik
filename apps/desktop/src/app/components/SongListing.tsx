import React, {FC, useState} from "react";
import {Box, Progress} from "@chakra-ui/react";
import {useAsync, UseAsyncReturn} from "react-async-hook";
import type {Song as SongType} from "@muzik/database";
import useThemeColours from "../hooks/useThemeColours";
import {invoke} from "../../lib/ipc/renderer";
import {EVENT_GET_ALL_SONG_IDS, EVENT_GET_SONG} from "../../lib/ipc-constants";
import {ErrorLabel} from "./lib/ErrorLabel";
import {SongList} from "./lib/SongList";

interface UseAllSongsResult extends UseAsyncReturn<SongType[]> {
    progress: number;
}

function useAllSongs(): UseAllSongsResult {
    const [progress, setProgress] = useState(0);

    const asyncResult = useAsync(async () => {
        const {songIds} = await invoke(EVENT_GET_ALL_SONG_IDS);

        return Promise.all(
            songIds.map(async (songId, idx) => {
                const song = await invoke(EVENT_GET_SONG, {songId});
                setProgress(prev =>
                    Math.max(prev, (idx / songIds.length) * 100)
                );
                return song.song;
            })
        );
    }, []);

    return {progress, ...asyncResult};
}

export const SongListing: FC = () => {
    const colours = useThemeColours();
    const songsAsync = useAllSongs();

    if (songsAsync.error || songsAsync.error) {
        return <ErrorLabel message={songsAsync.error.message} />;
    }

    return (
        <Box height="100%" bg={colours.backgroundL2}>
            {songsAsync.loading && (
                <Progress hasStripe isAnimated value={songsAsync.progress} />
            )}
            {songsAsync.result && <SongList songs={songsAsync.result} />}
        </Box>
    );
};
