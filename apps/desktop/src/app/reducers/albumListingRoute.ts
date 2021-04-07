import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export const slice = createSlice({
    name: "albumListingRoute",
    initialState: {
        selectedAlbum: -1
    },
    reducers: {
        selectAlbum(state, action: PayloadAction<number>) {
            state.selectedAlbum = action.payload;
        }
    }
});

export const {selectAlbum} = slice.actions;
