import {Box, HStack, Portal, SlideFade, VStack} from "@chakra-ui/react";
import React, {
    createContext,
    FC,
    ForwardedRef,
    forwardRef,
    MouseEvent,
    ReactNode,
    RefAttributes,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import useThemeColours from "../../hooks/useThemeColours";

export interface UseContextMenuRes {
    props: Omit<ContextMenuProps, "children"> & RefAttributes<HTMLDivElement>;

    onContextMenu(event: MouseEvent<HTMLElement>): void;
}

export function useContextMenu(): UseContextMenuRes {
    const [isOpen, setOpen] = useState(false);
    const [contextMenuTarget, setContextMenuTarget] = useState<
        [number, number]
    >([0, 0]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handler = useCallback(
        (event: MouseEvent) => {
            const container = containerRef.current;
            if (!container) return;
            const x = Math.min(
                event.clientX,
                window.innerWidth - container.offsetWidth
            );
            const y = Math.min(
                event.clientY,
                window.innerHeight - container.offsetHeight
            );
            setContextMenuTarget([x, y]);
            setOpen(true);
        },
        [containerRef]
    );

    return {
        onContextMenu: handler,
        props: {
            open: isOpen,
            targetPosition: contextMenuTarget,
            onClose: () => setOpen(false),
            ref: containerRef
        }
    };
}

interface GlobalContextMenuContext {
    activeMenu: ContextMenuContext | null;

    setActiveMenu(menu: ContextMenuContext): void;
}

const GlobalContextMenuContext = createContext<GlobalContextMenuContext>(null);

export const ContextMenuProvider: FC = ({children}) => {
    const [activeMenu, setActiveMenu] = useState<ContextMenuContext>(null);

    const contextValue = useMemo<GlobalContextMenuContext>(
        () => ({
            activeMenu,
            setActiveMenu
        }),
        [activeMenu, setActiveMenu]
    );

    const close = useCallback(() => {
        activeMenu?.close();
    }, [activeMenu]);

    const handleMouseDown = useCallback(
        (e: MouseEvent) => {
            close();

            const htmlEl = e.currentTarget as HTMLElement;
            htmlEl.style.pointerEvents = "none";

            setTimeout(() => (htmlEl.style.pointerEvents = ""), 0);
        },
        [close]
    );

    useEffect(() => {
        function handleKeydown(e: KeyboardEvent) {
            if (e.key === "Escape") close();
        }

        document.body.addEventListener("keydown", handleKeydown);
        return () =>
            document.body.removeEventListener("keydown", handleKeydown);
    }, [close]);

    useEffect(() => {
        function handleBlur() {
            close();
        }

        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
    });

    return (
        <GlobalContextMenuContext.Provider value={contextValue}>
            {children}
            <Portal>
                <Box
                    position="fixed"
                    top={0}
                    bottom={0}
                    left={0}
                    right={0}
                    zIndex={99}
                    style={{display: activeMenu ? "" : "none"}}
                    onMouseDown={handleMouseDown}
                />
            </Portal>
        </GlobalContextMenuContext.Provider>
    );
};

interface ContextMenuContext {
    uniqueSymbol: symbol;
    close(): void;
    isChild(element: Element): boolean;
}

const ContextMenuContext = createContext<ContextMenuContext | null>(null);

export interface ContextMenuProps {
    open: boolean;
    targetPosition: readonly [number, number];
    children: ReactNode;

    onClose?(): void;
}

export const ContextMenu = forwardRef(function ContextMenu(
    props: ContextMenuProps,
    ref: ForwardedRef<HTMLDivElement>
) {
    const globalContext = useContext(GlobalContextMenuContext);
    if (globalContext === null)
        throw new Error("ContextMenuProvider must wrap your App");

    const colours = useThemeColours();

    const uniqueSymbol = useMemo(() => Symbol("ContextMenu"), []);

    const parentRef = useRef<HTMLDivElement>();
    const checkIsChild = useCallback(
        (child: Element) => {
            const {current} = parentRef;
            if (!current) return false;
            return current.contains(child);
        },
        [parentRef.current]
    );

    const contextValue = useMemo<ContextMenuContext>(
        () => ({
            uniqueSymbol,
            close: props.onClose,
            isChild: checkIsChild
        }),
        [props.onClose, uniqueSymbol, checkIsChild]
    );

    useEffect(() => {
        if (props.open) {
            if (globalContext.activeMenu?.uniqueSymbol !== uniqueSymbol) {
                globalContext.activeMenu?.close();
                globalContext.setActiveMenu(contextValue);
            }
        } else {
            if (globalContext.activeMenu?.uniqueSymbol === uniqueSymbol) {
                globalContext.setActiveMenu(null);
            }
        }

        return () => {
            if (globalContext.activeMenu?.uniqueSymbol === uniqueSymbol) {
                globalContext.setActiveMenu(null);
            }
        };
    }, [
        contextValue,
        props.open,
        globalContext.setActiveMenu,
        globalContext.activeMenu
    ]);

    return (
        <Portal>
            <Box
                ref={parentRef}
                position="fixed"
                zIndex={100}
                style={{
                    top: props.targetPosition[1],
                    left: props.targetPosition[0],
                    pointerEvents: props.open ? "auto" : "none"
                }}
            >
                <SlideFade in={props.open} offsetY="20px">
                    <VStack
                        ref={ref}
                        align="stretch"
                        background={colours.backgroundL2}
                        shadow="md"
                        borderRadius="md"
                        w="16rem"
                        py={2}
                    >
                        <ContextMenuContext.Provider value={contextValue}>
                            {props.children}
                        </ContextMenuContext.Provider>
                    </VStack>
                </SlideFade>
            </Box>
        </Portal>
    );
});

export interface MenuItemProps {
    // return `true` to cancel default actions
    onClick?(): boolean | void | Promise<boolean | void>;
}

export const MenuItem: FC<MenuItemProps> = props => {
    const context = useContext(ContextMenuContext);
    if (context === null)
        throw new Error("MenuItem must be inside ContextMenu");

    const colours = useThemeColours();

    const handleClick = async () => {
        if (!(await props.onClick?.())) context.close();
    };

    return (
        <HStack
            cursor="pointer"
            px={4}
            py={2}
            _hover={{background: colours.translucentHoverBg}}
            _active={{background: colours.translucentActiveBg}}
            color={colours.text}
            onClick={handleClick}
        >
            {props.children}
        </HStack>
    );
};
