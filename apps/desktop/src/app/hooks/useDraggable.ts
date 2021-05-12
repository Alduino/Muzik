import {DragEventHandler, useCallback, useMemo} from "react";

interface DraggableNodeProps {
    draggable: boolean;
}

export interface UseDraggableResult {
    onDragStart: DragEventHandler<HTMLElement>;
    onDragEnd: DragEventHandler<HTMLElement>;
    props: DraggableNodeProps;
}

export interface UseDraggableOpts {
    resize?(w: number, h: number): [number, number];
    offset?(w: number, h: number): [number, number];
    fillData?(transfer: DataTransfer): void;
    fillDataTransferItem?(transfer: DataTransferItem): void;
}

function createResizedVersion(
    el: HTMLElement,
    [width, height]: [number, number]
) {
    const clone = el.cloneNode(true) as HTMLElement;

    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.position = "fixed";
    clone.style.top = "-1000px";
    clone.style.left = "0px";
    document.body.appendChild(clone);

    setTimeout(() => clone.remove(), 0);

    return clone;
}

export default function useDraggable({
    resize = () => [0, 0],
    offset = (w, h) => [w / 2, h / 2],
    fillData
}: UseDraggableOpts = {}): UseDraggableResult {
    const handleDragStart = useCallback<DragEventHandler<HTMLElement>>(
        e => {
            const el = e.currentTarget;

            const w = el.scrollWidth,
                h = el.scrollHeight;

            const resizedResult = resize(w, h);
            const hasResize = resizedResult[0] !== w || resizedResult[1] !== h;

            const offsetResult = offset(resizedResult[0], resizedResult[1]);

            const resizeTargetEl = hasResize
                ? createResizedVersion(el, resizedResult)
                : null;

            fillData?.(e.dataTransfer);

            e.dataTransfer.setDragImage(
                resizeTargetEl ?? el,
                // drags from mouse position relative to element - resize target el is at 0,-1000
                offsetResult[0],
                offsetResult[1]
            );
        },
        [resize, offset]
    );

    const handleDragEnd = useCallback<DragEventHandler<HTMLElement>>(e => {
        /* noop */
    }, []);

    const props = useMemo(
        () => ({
            draggable: true
        }),
        []
    );

    return {
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        props
    };
}
