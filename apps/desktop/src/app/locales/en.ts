import Locale from "./Locale";

export const en: Locale = {
    app: {
        title: {
            normal: "Muzik",
            playing: "Muzik ({{artist}} - {{track}})"
        },
        queueControls: {
            toggleShuffle: "Toggle shuffle",
            switchRepeatMode: "Switch repeat mode",
            addToQueue: "Add to queue",
            playNext: "Play next",
            playSong: "Play song",
            playAlbum: "Play album",
            playAll: "Play all"
        },
        utils: {
            copyFilePath: "Copy file path",
            openContainingFolder: "Open containing folder"
        },
        routes: {
            albums: "Albums",
            songs: "Songs",
            queue: "Queue"
        },
        queueRoute: {
            nowPlaying: "Now playing",
            upNext: "Up next",
            later: "Later",
            emptyQueue: "Your queue is empty",
            nothingPlaying: "Nothing is playing right now",
            loading: "Loading..."
        },
        sidebarGroups: {
            routes: "Routes",
            playlists: "Playlists"
        }
    }
};
