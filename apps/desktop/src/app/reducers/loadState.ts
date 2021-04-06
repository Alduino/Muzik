import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export const slice = createSlice({
    name: "loadState",
    initialState: {
        value: false,
        currentDescription: ""
    },
    reducers: {
        setLoadComplete(state) {
            state.value = true;
        },
        setCurrentDescription(state, action: PayloadAction<string>) {
            state.currentDescription = action.payload;
        }
    }
});

export const {setLoadComplete, setCurrentDescription} = slice.actions;
