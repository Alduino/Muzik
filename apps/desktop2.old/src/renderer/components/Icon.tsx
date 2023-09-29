import {ReactElement, SVGProps} from "react";

export interface IconProps {
    icon: string;
}

export function Icon({
    icon,
    ...svgProps
}: IconProps & SVGProps<SVGSVGElement>): ReactElement {
    return (
        <svg viewBox="0 0 24 24" {...svgProps}>
            <path fill="currentcolor" d={icon} />
        </svg>
    );
}
