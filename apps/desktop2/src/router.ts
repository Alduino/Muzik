import {createHashRouter} from "react-router-dom";
import {ErrorBoundary} from "./features/error-boundary";
import {AppLayoutRoute, AppOuterLayoutRoute} from "./features/layout";

export const router = createHashRouter([
    {
        path: "/",
        Component: AppOuterLayoutRoute,
        children: [
            {
                index: true,
                lazy: () => import("./features/splash")
            },
            {
                Component: AppLayoutRoute,
                ErrorBoundary,
                children: [
                    {
                        path: "songs",
                        lazy: () => import("./features/songs-list")
                    },
                    {
                        path: "settings",
                        lazy: () => import("./features/settings")
                    }
                ]
            }
        ]
    }
]);
