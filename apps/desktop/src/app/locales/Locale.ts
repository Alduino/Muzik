import {ResourceLanguage} from "i18next";

export default interface Locale extends ResourceLanguage {
    app: {
        title: {
            normal: string;
            playing: string;
        };
        queueControls: {
            volume: string;
            toggleShuffle: string;
            switchRepeatMode: string;
            addToQueue: string;
            playNext: string;
            playSong: string;
            playAlbum: string;
            playAll: string;
        };
        utils: {
            copyFilePath: string;
            openContainingFolder: string;
        };
        routes: {
            albums: string;
            songs: string;
            queue: string;
            settings: string;
        };
        queueRoute: {
            nowPlaying: string;
            upNext: string;
            later: string;
            nothingPlaying: string;
            emptyQueue: string;
            loading: string;
        };
        settingsRoute: {
            musicDirectories: string;
            removeDirectory: string;
            selectDirectory: string;
        };
        sidebarGroups: {
            routes: string;
            playlists: string;
        };
    };
}
