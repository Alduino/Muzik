import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export enum GlobalRoute {
    artistListing,
    albumListing,
    songListing,
    queueListing,
    musicStorePicker
}

export const slice = createSlice({
    name: "routing",
    initialState: {
        globalRoute: GlobalRoute.albumListing,
        albumArtIsLarge: false
    },
    reducers: {
        setGlobalRoute(state, action: PayloadAction<GlobalRoute>) {
            state.globalRoute = action.payload;
        },
        setAlbumArtSize(state, {payload}: PayloadAction<boolean>) {
            state.albumArtIsLarge = payload;
        }
    }
});

export const {setGlobalRoute, setAlbumArtSize} = slice.actions;
