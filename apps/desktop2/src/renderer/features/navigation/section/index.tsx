import {ReactElement} from "react";
import {containerClass, titleClass} from "./styles.css.ts";

export interface SectionProps {
    title?: string;
    children: ReactElement;
}

export function Section({title, children}: SectionProps): ReactElement {
    return (
        <div className={containerClass}>
            {title && <h2 className={titleClass}>{title}</h2>}
            {children}
        </div>
    );
}
