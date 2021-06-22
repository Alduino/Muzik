import {Box, Flex} from "@chakra-ui/react";
import React, {FC, useMemo} from "react";
import useLetterCounts from "../hooks/useLetterCounts";
import useThemeColours from "../hooks/useThemeColours";
import useAllTrackIds from "../rpc/useAllTrackIds";
import useFirstArtistLettersByTrackIds from "../rpc/useFirstArtistLettersByTrackIds";
import {ErrorText} from "./lib/ErrorText";
import {ScrollBarAlphabetViewer} from "./lib/ScrollBarAlphabetViewer";
import {SongList} from "./lib/SongList";

const emptyArray = [] as const;

export const SongListing: FC = () => {
    const colours = useThemeColours();
    const {data: tracks, error} = useAllTrackIds();
    const {
        data: firstLetters,
        error: firstLetterError
    } = useFirstArtistLettersByTrackIds(tracks?.trackIds);

    const firstLettersWithoutNumbers = useMemo(
        () =>
            (firstLetters ?? emptyArray).map((el: string) =>
                /^\d$/.test(el) ? "#" : el
            ),
        [firstLetters]
    );

    const letterCounts = useLetterCounts(firstLettersWithoutNumbers);

    if (error) {
        return <ErrorText error={error} />;
    } else if (firstLetterError) {
        return <ErrorText error={firstLetterError} />;
    }

    return (
        <Flex
            justifyContent="stretch"
            direction="row"
            height="100%"
            bg={colours.backgroundL2}
        >
            <Box flexGrow={1}>
                {tracks && <SongList songIds={tracks.trackIds} />}
            </Box>
            <ScrollBarAlphabetViewer letterCounts={letterCounts} />
        </Flex>
    );
};
