import {ReactElement, SVGProps} from "react";

const innerHtml = `<style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle></g>`;

export function Spinner(
    props: Omit<SVGProps<SVGSVGElement>, "children">
): ReactElement {
    return (
        <svg
            width="1em"
            height="1em"
            stroke="currentcolor"
            {...props}
            viewBox="0 0 24 24"
            dangerouslySetInnerHTML={{__html: innerHtml}}
        />
    );
}