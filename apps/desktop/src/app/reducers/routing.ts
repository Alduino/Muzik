import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export enum GlobalRoute {
    artistListing,
    albumListing,
    songListing,
    musicStorePicker
}

export const slice = createSlice({
    name: "routing",
    initialState: {
        globalRoute: GlobalRoute.songListing
    },
    reducers: {
        setGlobalRoute(state, action: PayloadAction<GlobalRoute>) {
            state.globalRoute = action.payload;
        }
    }
});

export const {setGlobalRoute} = slice.actions;
