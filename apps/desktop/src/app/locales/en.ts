import Locale from "./Locale";

export const en: Locale = {
    app: {
        title: {
            normal: "Muzik",
            playing: "Muzik ({{artist}} - {{track}})"
        },
        queueControls: {
            volume: "Volume",
            toggleShuffle: "Toggle shuffle",
            switchRepeatMode: "Switch repeat mode",
            addToQueue: "Add to queue",
            playNext: "Play next",
            playSong: "Play song",
            playAlbum: "Play album",
            playAll: "Play all"
        },
        discord: {
            playing: "Playing",
            paused: "Paused"
        },
        utils: {
            copyFilePath: "Copy file path",
            openContainingFolder: "Open containing folder"
        },
        routes: {
            albums: "Albums",
            songs: "Songs",
            queue: "Queue",
            settings: "Settings"
        },
        queueRoute: {
            nowPlaying: "Now playing",
            upNext: "Up next",
            later: "Later",
            emptyQueue: "Your queue is empty",
            nothingPlaying: "Nothing is playing right now",
            loading: "Loading..."
        },
        settingsRoute: {
            musicDirectories: "Source Directories",
            removeDirectory: "Remove",
            selectDirectory: "Select a new directory",
            discordIntegrationLabel: "Discord Integration",
            discordIntegration: {
                enable: "Enable",
                enableInfo:
                    "Shows what song is playing on your Discord profile. Requires the Discord desktop app to be running.",
                displayWhenPaused: "Display when paused",
                displayWhenPausedInfo:
                    "Show what song is playing if it is paused."
            },
            mediaBarLabel: "Media bar",
            mediaBar: {
                position: "Position",
                positionInfo: "Select where the media bar should be placed",
                positionTop: "Top",
                positionBottom: "Bottom"
            }
        },
        sidebarGroups: {
            routes: "Routes",
            playlists: "Playlists"
        }
    }
};
