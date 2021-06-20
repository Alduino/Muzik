import Store from "electron-store";

interface StoreValues {
    musicStore: string[];
}

export const store = new Store<StoreValues>();
