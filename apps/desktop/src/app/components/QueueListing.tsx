import {Box, Heading, HStack} from "@chakra-ui/react";
import React, {FC, useMemo} from "react";
import {useAsync} from "react-async-hook";
import {useTranslation} from "react-i18next";
import {AiOutlineInfoCircle} from "react-icons/ai";
import {EVENT_GET_SONG} from "../../lib/ipc-constants";
import {invoke} from "../../lib/ipc/renderer";
import {getShuffleIndex} from "../reducers/queue";
import {useAppSelector} from "../store-hooks";
import {LiteralSongList, Song as TrackImpl} from "./lib/SongList";
import {TransText} from "./lib/TransText";

const fetchTrackById = (songId: number) => invoke(EVENT_GET_SONG, {songId});
const fetchTracksByIds = (ids: number[]) =>
    Promise.all(ids.map(songId => invoke(EVENT_GET_SONG, {songId})));

interface TrackProps {
    id: number;
}

const InfoBox: FC<{label: string}> = props => (
    <HStack px={4} py={2}>
        <AiOutlineInfoCircle />
        <TransText k={props.label} opacity={0.8} />
    </HStack>
);

const Track: FC<TrackProps> = props => {
    const {result, loading} = useAsync(fetchTrackById, [props.id]);

    if (loading) {
        return <InfoBox label="queueRoute.loading" />;
    }

    return <TrackImpl song={result.song} clearQueueOnPlay={false} />;
};

export const QueueListing: FC = () => {
    const {t} = useTranslation("app");

    const nowPlaying = useAppSelector(state => state.queue.nowPlaying);

    const upNext = useAppSelector(state => state.queue.playNextSongs);
    const later = useAppSelector(state => state.queue.songs);

    const nextTenShuffled = useMemo(() => {
        return Array.from(
            {length: 10},
            (_, idx) => later[getShuffleIndex(later.length, false, idx)]
        ).filter(el => el);
    }, [later]);

    const upNextTracks = useAsync(fetchTracksByIds, [upNext]);
    const laterTracks = useAsync(fetchTracksByIds, [nextTenShuffled]);

    return (
        <Box>
            <Heading size="sm" m={2}>
                {t("queueRoute.nowPlaying")}
            </Heading>
            {nowPlaying ? (
                <Track id={nowPlaying} />
            ) : (
                <InfoBox label="queueRoute.nothingPlaying" />
            )}
            {upNextTracks.result?.length ? (
                <Heading size="sm" mt={16} mb={2} ml={2}>
                    {t("queueRoute.upNext")}
                </Heading>
            ) : null}
            {upNextTracks.result?.length ? (
                <LiteralSongList
                    songs={upNextTracks.result?.map(item => item.song)}
                    clearQueueOnPlay={false}
                />
            ) : null}
            <Heading size="sm" mt={16} mb={2} ml={2}>
                {t("queueRoute.later")}
            </Heading>
            {laterTracks.result?.length ? (
                <LiteralSongList
                    songs={laterTracks.result?.map(item => item.song)}
                    clearQueueOnPlay={false}
                />
            ) : (
                <InfoBox label="queueRoute.emptyQueue" />
            )}
        </Box>
    );
};
