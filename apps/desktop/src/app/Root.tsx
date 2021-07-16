import {ChakraProvider, ColorModeScript, useColorMode} from "@chakra-ui/react";
import React, {
    FC,
    ReactElement,
    ReactNode,
    useEffect,
    useMemo,
    useState
} from "react";
import {useAsync} from "react-async-hook";
import {Provider as ReduxProvider} from "react-redux";
import {EVENT_REDUX_DEV_TOOLS_ENABLED} from "../lib/ipc-constants";
import {invoke} from "../lib/ipc/renderer";
import getThemeConfiguration from "../lib/rpc/get-theme-configuration/app";
import handleSetNativeColourMode from "../lib/rpc/set-native-colour-mode/app";
import {DevTools} from "./DevTools";
import {App} from "./components/App";
import {
    AudioController,
    AudioControllerProvider,
    MediaSessionController
} from "./components/lib/AudioController";
import {ContextMenuProvider} from "./components/lib/ContextMenu";
import {CustomScrollProvider} from "./components/lib/CustomScrollProvider";
import {StoreSaver} from "./components/lib/StoreSaver";
import {TitleController} from "./components/lib/TitleController";
import {RpcConfigurator} from "./rpc";
import useThemeConfiguration from "./rpc/useThemeConfiguration";
import store from "./store";
import {useAppSelector} from "./store-hooks";
import createTheme from "./theme";

const getDevToolsEnabled = () => invoke(EVENT_REDUX_DEV_TOOLS_ENABLED);

function WhenInitialised({children}: {children: ReactNode}) {
    const isInitialised = useAppSelector(state => state.loadState.value);

    if (!isInitialised) return null;
    return <>{children}</>;
}

function ColourModeController(): null {
    const [nativeColourMode, setNativeColourMode] = useState<string>();
    const {setColorMode} = useColorMode();

    useEffect(() => {
        handleSetNativeColourMode(async req => {
            setNativeColourMode(req);
        });
    }, [setNativeColourMode]);

    useEffect(() => {
        if (!nativeColourMode) return;
        setColorMode(nativeColourMode);
    }, [nativeColourMode]);

    return null;
}

function ChakraProviderWrapper({
    children
}: {
    children: ReactNode;
}): ReactElement {
    const {data: themeConfig} = useThemeConfiguration();
    const {result: initialThemeConfig} = useAsync(getThemeConfiguration, []);

    const theme = useMemo(
        () =>
            createTheme({
                config: {
                    initialColorMode:
                        initialThemeConfig?.colourMode === "system"
                            ? "dark"
                            : initialThemeConfig?.colourMode ?? "dark",
                    useSystemColorMode: themeConfig?.colourMode === "system"
                }
            }),
        [initialThemeConfig?.colourMode, themeConfig?.colourMode]
    );

    return (
        <ChakraProvider theme={theme}>
            <ColourModeController />
            {children}
        </ChakraProvider>
    );
}

export const Root: FC = () => {
    const devToolsEnabled = useAsync(getDevToolsEnabled, []);
    const {
        result: initialThemeConfig,
        error: initialThemeConfigError
    } = useAsync(getThemeConfiguration, []);

    if (initialThemeConfigError) {
        return (
            <>
                <h1>Initialisation Error</h1>
                <p>
                    Muzik failed to initialise:{" "}
                    {initialThemeConfigError.message}
                </p>
            </>
        );
    } else if (!initialThemeConfig) {
        return <p>...</p>;
    }

    return (
        <ReduxProvider store={store}>
            <ColorModeScript initialColorMode={initialThemeConfig.colourMode} />
            <RpcConfigurator refreshInterval={1000} instantCallThreshold={100}>
                <ChakraProviderWrapper>
                    <AudioControllerProvider>
                        <WhenInitialised>
                            <AudioController />
                            <MediaSessionController />
                            <TitleController />
                            <StoreSaver />
                        </WhenInitialised>
                        <ContextMenuProvider>
                            <CustomScrollProvider>
                                <App />
                            </CustomScrollProvider>
                        </ContextMenuProvider>
                    </AudioControllerProvider>
                </ChakraProviderWrapper>
            </RpcConfigurator>
            {devToolsEnabled.result &&
                process.env.NODE_ENV === "development" && <DevTools />}
        </ReduxProvider>
    );
};
