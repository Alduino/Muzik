import {ReactElement, useId} from "react";
import {NavLink as Link} from "react-router-dom";
import {Icon} from "../../../components/Icon.tsx";
import {iconClass, linkStyle, textClass} from "./styles.css.ts";

export interface NavLinkProps {
    title: string;
    path: string;
    icon?: string;
}

export function NavLink({title, path, icon}: NavLinkProps): ReactElement {
    const titleId = useId();

    return (
        <Link className={linkStyle} to={path}>
            {icon && (
                <Icon
                    className={iconClass}
                    icon={icon}
                    aria-labelledby={titleId}
                />
            )}
            <span className={textClass} id={titleId}>
                {title}
            </span>
        </Link>
    );
}
