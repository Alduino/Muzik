import {Box} from "@chakra-ui/react";
import React, {FC} from "react";
import useThemeColours from "../hooks/useThemeColours";
import useAllTrackIds from "../rpc/useAllTrackIds";
import {ErrorText} from "./lib/ErrorText";
import {SongList} from "./lib/SongList";

export const SongListing: FC = () => {
    const colours = useThemeColours();

    const {data: tracks, error} = useAllTrackIds();

    if (error) {
        return <ErrorText error={error} />;
    }

    return (
        <Box height="100%" bg={colours.backgroundL2}>
            {tracks && <SongList songIds={tracks.trackIds} />}
        </Box>
    );
};
