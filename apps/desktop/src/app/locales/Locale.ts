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
        };
        utils: {
            copyFilePath: string;
            openContainingFolder: string;
        };
    };
}
