import {Box, HStack, Portal, SlideFade, VStack} from "@chakra-ui/react";
import React, {
    createContext,
    FC,
    MouseEvent,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import useThemeColours from "../../hooks/useThemeColours";

export interface UseContextMenuRes {
    props: ContextMenuProps;

    onContextMenu(event: MouseEvent<HTMLElement>): void;
}

export function useContextMenu(): UseContextMenuRes {
    const [isOpen, setOpen] = useState(false);
    const [contextMenuTarget, setContextMenuTarget] = useState<
        [number, number]
    >([0, 0]);

    const handler = (event: MouseEvent) => {
        setContextMenuTarget([event.clientX, event.clientY]);
        setOpen(true);
    };

    return {
        onContextMenu: handler,
        props: {
            open: isOpen,
            targetPosition: contextMenuTarget,
            onClose: () => setOpen(false)
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

    useEffect(() => {
        function callback(event: Event) {
            if (activeMenu?.isChild(event.target as Element)) return;
            activeMenu?.close();
        }

        document.body.addEventListener("click", callback);
        return () => document.body.removeEventListener("click", callback);
    }, [activeMenu]);

    return (
        <GlobalContextMenuContext.Provider value={contextValue}>
            {children}
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

    onClose?(): void;
}

export const ContextMenu: FC<ContextMenuProps> = props => {
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
                style={{
                    top: props.targetPosition[1],
                    left: props.targetPosition[0],
                    position: "fixed"
                }}
            >
                <SlideFade in={props.open} offsetY="20px" unmountOnExit>
                    <VStack
                        align="stretch"
                        background={colours.backgroundL1}
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
};

export interface MenuItemProps {
    // return `true` to cancel default actions
    onClick?(): boolean | void;
}

export const MenuItem: FC<MenuItemProps> = props => {
    const context = useContext(ContextMenuContext);
    if (context === null)
        throw new Error("MenuItem must be inside ContextMenu");

    const colours = useThemeColours();

    const handleClick = () => {
        if (!props.onClick?.()) context.close();
    };

    return (
        <HStack
            cursor="pointer"
            px={4}
            py={2}
            _hover={{background: colours.translucentHoverBg}}
            _active={{background: colours.translucentActiveBg}}
            onClick={handleClick}
        >
            {props.children}
        </HStack>
    );
};
