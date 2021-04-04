import {combineReducers} from "@reduxjs/toolkit";
import {slice as loadState} from "./loadState";

const rootReducer = combineReducers({
    loadState: loadState.reducer
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
