import Store from "electron-store";

interface StoreValues {
    musicStore: string[];
    themeConfiguration: {
        colourMode: "light" | "dark" | "system";
    };
}

export const store = new Store<StoreValues>();
