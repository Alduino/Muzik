import React, {FC} from "react";
import {Box} from "@chakra-ui/react";
import useThemeColours from "../hooks/useThemeColours";
import {invoke} from "../../lib/ipc/renderer";
import {EVENT_GET_ALL_TRACKS} from "../../lib/ipc-constants";
import {ErrorLabel} from "./lib/ErrorLabel";
import {SongList} from "./lib/SongList";
import {useAsync} from "react-async-hook";

const fetchTracks = () => invoke(EVENT_GET_ALL_TRACKS);

export const SongListing: FC = () => {
    const colours = useThemeColours();

    const tracksAsync = useAsync(fetchTracks, []);

    if (tracksAsync.error || tracksAsync.error) {
        return <ErrorLabel message={tracksAsync.error.message} />;
    }

    return (
        <Box height="100%" bg={colours.backgroundL2}>
            {tracksAsync.result && (
                <SongList songs={tracksAsync.result.tracks} />
            )}
        </Box>
    );
};
