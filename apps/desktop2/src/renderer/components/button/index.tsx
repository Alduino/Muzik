import {ReactElement, useId} from "react";
import {Link} from "react-router-dom";
import {Icon} from "../Icon.tsx";
import {containerClass} from "./styles.css.ts";

export interface ButtonProps {
    icon?: string;
    label: string;

    // turns the button into a button-styled link
    href?: string;
}

export function Button({label, icon, href}: ButtonProps): ReactElement {
    const labelId = useId();

    const children = (
        <>
            {icon && <Icon icon={icon} aria-labelledby={labelId} />}
            <span id={labelId}>{label}</span>
        </>
    );

    if (href) {
        return (
            <Link className={containerClass} to={href}>
                {children}
            </Link>
        );
    } else {
        return <button className={containerClass}>{children}</button>;
    }
}
