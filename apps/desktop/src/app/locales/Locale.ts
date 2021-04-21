import {ResourceLanguage} from "i18next";

export default interface Locale extends ResourceLanguage {
    app: {
        title: {
            normal: string;
            playing: string;
        };
        mediaControls: {
            toggleShuffle: string;
            switchRepeatMode: string;
        };
    };
}
