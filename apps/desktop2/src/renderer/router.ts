import {createHashRouter} from "react-router-dom";
import {ErrorBoundary} from "./features/error-boundary";
import {AppLayoutRoute} from "./features/layout";
import {SongsList} from "./features/songs-list";

export const router = createHashRouter([
    {
        path: "/",
        Component: AppLayoutRoute,
        ErrorBoundary,
        children: [
            {
                path: "songs",
                index: true,
                Component: SongsList
            }
        ]
    }
]);
