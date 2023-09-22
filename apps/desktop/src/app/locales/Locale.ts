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
        discord: {
            playing: string;
            paused: string;
        };
        utils: {
            copyFilePath: string;
            openContainingFolder: string;
        };
        routes: {
            albums: string;
            songs: string;
            queue: string;
            cinema: string;
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
            discordIntegrationLabel: string;
            discordIntegration: {
                enable: string;
                enableInfo: string;
                displayWhenPaused: string;
                displayWhenPausedInfo: string;
            };
            mediaBarLabel: string;
            mediaBar: {
                position: string;
                positionInfo: string;
                positionTop: string;
                positionBottom: string;
            };
            themeLabel: string;
            theme: {
                colourMode: string;
                colourModeInfo: string;
                colourModeLight: string;
                colourModeDark: string;
                colourModeSystem: string;
            };
        };
        sidebarGroups: {
            routes: string;
            playlists: string;
        };
    };
}
