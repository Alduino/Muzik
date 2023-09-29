import {ReactElement, useId} from "react";
import {Link} from "react-router-dom";
import {Icon} from "../Icon.tsx";
import {containerStyle, iconClass} from "./styles.css.ts";

export interface ButtonProps {
    icon?: string;
    label: string;

    iconOnly?: boolean;

    // turns the button into a button-styled link
    href?: string;

    fullWidth?: boolean;

    disabled?: boolean;

    onClick?(): void;
}

export function Button({
    label,
    icon,
    iconOnly,
    href,
    fullWidth,
    disabled,
    onClick
}: ButtonProps): ReactElement {
    const labelId = useId();

    const children = (
        <>
            {icon && (
                <Icon
                    className={iconClass}
                    icon={icon}
                    aria-labelledby={iconOnly ? undefined : labelId}
                    aria-label={iconOnly ? label : undefined}
                />
            )}
            {!iconOnly && <span id={labelId}>{label}</span>}
        </>
    );

    if (href) {
        return (
            <Link
                className={containerStyle({iconOnly, fullWidth})}
                to={href}
                onClick={onClick}
            >
                {children}
            </Link>
        );
    } else {
        return (
            <button
                className={containerStyle({iconOnly, fullWidth})}
                disabled={disabled}
                onClick={onClick}
            >
                {children}
            </button>
        );
    }
}
