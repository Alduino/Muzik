import {ResourceLanguage} from "i18next";

export default interface Locale extends ResourceLanguage {
    app: {
        title: {
            normal: string;
            playing: string;
        };
        queueControls: {
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
        };
        sidebarGroups: {
            routes: string;
            playlists: string;
        };
    };
}
