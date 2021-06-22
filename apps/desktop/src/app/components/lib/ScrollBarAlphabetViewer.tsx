import {Center, Box} from "@chakra-ui/react";
import React, {ReactElement, useMemo} from "react";
import useDimensions from "react-cool-dimensions";
import useThemeColours from "../../hooks/useThemeColours";

/**
 * Maps each letter to the percentage of the list it takes up
 */
export type LetterCounts = {[key: string]: number};

export interface ScrollBarAlphabetViewerProps {
    letterCounts: LetterCounts;
}

export const ScrollBarAlphabetViewer = ({
    letterCounts
}: ScrollBarAlphabetViewerProps): ReactElement => {
    const colours = useThemeColours();
    const {observe: containerElement, height: containerHeight} = useDimensions(
        {}
    );

    const includedLetters = useMemo(() => {
        // TODO: Sort and remove smallest that make it too large

        const entries = Object.entries(letterCounts);
        const totalCount = entries.reduce(
            (total, [, count]) => total + count,
            0
        );
        const includedEntries: string[] = [];

        for (const item of entries) {
            const [letter, count] = item;
            const actualHeight = (count / totalCount) * containerHeight;
            if (actualHeight > 20) includedEntries.push(letter);
        }

        return includedEntries;
    }, [letterCounts, containerHeight]);

    const totalCount = useMemo(() => {
        const entries = includedLetters.map(
            letter => [letter, letterCounts[letter]] as const
        );

        return entries.reduce((total, [, count]) => total + count, 0);
    }, [includedLetters]);

    const letterPositions = useMemo(() => {
        const entries = includedLetters.map(
            letter => [letter, letterCounts[letter]] as const
        );

        let accum = 0;

        return Object.fromEntries(
            entries.map(([letter, height]) => {
                const position = accum;
                accum += height / totalCount;
                return [letter, position];
            })
        );
    }, [includedLetters, totalCount]);

    return (
        <Box ref={containerElement} w={10} bg="#171923" position="relative">
            {includedLetters.map((letter: string) => (
                <Center
                    key={letter}
                    color="white"
                    borderColor={colours.backgroundL3}
                    borderStyle="solid"
                    style={{
                        top: letterPositions[letter] * containerHeight + "px",
                        height:
                            (letterCounts[letter] / totalCount) *
                                containerHeight +
                            "px"
                    }}
                    _notLast={{
                        borderBottomWidth: "1px"
                    }}
                >
                    {letter}
                </Center>
            ))}
        </Box>
    );
};
