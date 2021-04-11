import {combineReducers} from "@reduxjs/toolkit";
import {slice as loadState} from "./loadState";
import {slice as routing} from "./routing";
import {slice as albumListingRoute} from "./albumListingRoute";
import {slice as queue} from "./queue";

const rootReducer = combineReducers({
    loadState: loadState.reducer,
    routing: routing.reducer,
    albumListingRoute: albumListingRoute.reducer,
    queue: queue.reducer
});

export default rootReducer;
