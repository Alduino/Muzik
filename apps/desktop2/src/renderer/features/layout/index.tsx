import {clsx} from "clsx";
import {ReactElement, ReactNode, useEffect} from "react";
import {Outlet, useNavigate, useOutlet} from "react-router-dom";
import {SYSTEM_THEME_CLASS} from "../../theme/colour-scheme.css.ts";
import {Navigation} from "../navigation";
import {containerClass, contentClass} from "./styles.css.ts";

export interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({children}: AppLayoutProps): ReactElement {
    return (
        <div className={clsx(containerClass, SYSTEM_THEME_CLASS)}>
            <Navigation />

            <div className={contentClass}>{children}</div>
        </div>
    );
}

export function AppLayoutRoute(): ReactElement {
    const outlet = useOutlet();
    const redirect = useNavigate();

    useEffect(() => {
        if (!outlet) {
            redirect("/songs", {replace: true});
        }
    }, [outlet, redirect]);

    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}
