import Store from "electron-store";

interface StoreValues {
    musicStore: string | null;
}

export const store = new Store<StoreValues>({
    schema: {
        musicStore: {
            type: ["string", "null"],
            default: null
        }
    }
});
