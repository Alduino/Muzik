import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export const slice = createSlice({
    name: "loadState",
    initialState: {
        value: false,
        currentDescription: ""
    },
    reducers: {
        load(state) {
            state.value = true;
        },
        setCurrentlyLoading(state, action: PayloadAction<string>) {
            state.currentDescription = action.payload;
        }
    }
});

export const {load} = slice.actions;
