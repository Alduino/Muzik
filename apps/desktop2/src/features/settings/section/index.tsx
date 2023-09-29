import {ReactElement, ReactNode} from "react";
import {containerClass, dividerClass, headingClass} from "./styles.css.ts";

export interface SettingsSectionProps {
    title: string;
    children: ReactNode;
}

export function SettingsSection({
    title,
    children
}: SettingsSectionProps): ReactElement {
    return (
        <div className={containerClass}>
            <h3 className={headingClass}>{title}</h3>
            {children}
            <hr className={dividerClass} />
        </div>
    );
}
