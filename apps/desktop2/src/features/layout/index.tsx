import clsx from "clsx";
import {ReactElement, ReactNode} from "react";
import {Outlet} from "react-router-dom";
import {SYSTEM_THEME_CLASS} from "../../theme/colour-scheme.css.ts";
import {Navigation} from "../navigation";
import {
    containerClass,
    contentClass,
    outerContainerClass
} from "./styles.css.ts";

export function AppOuterLayoutRoute(): ReactElement {
    return (
        <div className={clsx(outerContainerClass, SYSTEM_THEME_CLASS)}>
            <Outlet />
        </div>
    );
}

export interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({children}: AppLayoutProps): ReactElement {
    return (
        <div className={containerClass}>
            <Navigation />
            <div className={contentClass}>{children}</div>
        </div>
    );
}

export function AppLayoutRoute(): ReactElement {
    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}
