import EventEmitter from "eventemitter3";

type MediaSessionEvents = {
    [key in MediaSessionAction]: (details: MediaSessionActionDetails) => void;
};

function createMediaSessionHandler() {
    const actions: MediaSessionAction[] = [
        "play",
        "pause",
        "seekbackward",
        "seekforward",
        "seekto",
        "previoustrack",
        "nexttrack",
        "stop"
    ];

    const emitter = new EventEmitter<MediaSessionEvents>();

    for (const action of actions) {
        const intermediate = (details: MediaSessionActionDetails) => {
            emitter.emit(action, details);
        };

        navigator.mediaSession.setActionHandler(action, intermediate);
    }

    return emitter;
}

export const mediaSessionHandler = createMediaSessionHandler();
