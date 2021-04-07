import {combineReducers} from "@reduxjs/toolkit";
import {slice as loadState} from "./loadState";
import {slice as routing} from "./routing";
import {slice as albumListingRoute} from "./albumListingRoute";

const rootReducer = combineReducers({
    loadState: loadState.reducer,
    routing: routing.reducer,
    albumListingRoute: albumListingRoute.reducer
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
