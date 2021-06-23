import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export const slice = createSlice({
    name: "media",
    initialState: {
        volume: 1
    },
    reducers: {
        setVolume(state, action: PayloadAction<number>) {
            state.volume = action.payload;
        }
    }
});

export const {setVolume} = slice.actions;
