import {combineReducers} from "@reduxjs/toolkit";
import {slice as albumListingRoute} from "./albumListingRoute";
import {slice as loadState} from "./loadState";
import {slice as media} from "./media";
import {slice as queue} from "./queue";
import {slice as routing} from "./routing";

const rootReducer = combineReducers({
    loadState: loadState.reducer,
    routing: routing.reducer,
    albumListingRoute: albumListingRoute.reducer,
    queue: queue.reducer,
    media: media.reducer
});

export default rootReducer;
