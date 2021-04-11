import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export const slice = createSlice({
    name: "loadState",
    initialState: {
        value: false,
        currentDescription: "",
        currentProgress: null as number | null
    },
    reducers: {
        setLoadComplete(state) {
            state.value = true;
        },
        setCurrentDescription(state, action: PayloadAction<string>) {
            state.currentDescription = action.payload;
            state.currentProgress = null;
        },
        setCurrentProgress(state, action: PayloadAction<number>) {
            state.currentProgress = action.payload;
        }
    }
});

export const {
    setLoadComplete,
    setCurrentDescription,
    setCurrentProgress
} = slice.actions;
