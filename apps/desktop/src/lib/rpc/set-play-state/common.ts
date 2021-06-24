import {g} from "../../ipc/common";

export type Response = void;

interface RequestWithTrack {
    /**
     * The ID of the track
     */
    trackId: number;

    /**
     * The time the track started playing, in epoch seconds
     */
    startedAt?: number;

    /**
     * The state of the audio
     */
    state: string;
}

interface RequestWithoutTrack {
    trackId: false;
}

export type Request = RequestWithTrack | RequestWithoutTrack;

export const event = g<Response, Request>("set-play-state");
