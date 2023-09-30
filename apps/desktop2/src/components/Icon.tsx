import {ReactElement, SVGProps} from "react";

export interface IconProps {
    icon: string;
}

export function Icon({
    icon,
    ...svgProps
}: IconProps & SVGProps<SVGSVGElement>): ReactElement {
    return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" {...svgProps}>
            <path fill="currentcolor" d={icon} />
        </svg>
    );
}
