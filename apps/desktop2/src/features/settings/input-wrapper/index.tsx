import {ReactElement, ReactNode} from "react";
import {containerClass, descriptionClass} from "./styles.css.ts";

export interface InputWrapperProps {
    label?: string;
    labelFor?: string;
    description?: string;
    children: ReactNode;
}

export function InputWrapper({
    label,
    labelFor,
    description,
    children
}: InputWrapperProps): ReactElement {
    return (
        <div className={containerClass}>
            {label && <label htmlFor={labelFor}>{label}</label>}
            <div>{children}</div>
            {description && (
                <span className={descriptionClass}>{description}</span>
            )}
        </div>
    );
}
