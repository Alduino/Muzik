import {combineReducers} from "@reduxjs/toolkit";
import {slice as loadState} from "./loadState";
import {slice as routing} from "./routing";

const rootReducer = combineReducers({
    loadState: loadState.reducer,
    routing: routing.reducer
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
