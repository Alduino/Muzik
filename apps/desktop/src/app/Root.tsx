import {ChakraProvider, ColorModeScript, useColorMode} from "@chakra-ui/react";
import React, {FC, ReactElement, ReactNode, useEffect, useMemo} from "react";
import {useAsync} from "react-async-hook";
import {Provider as ReduxProvider} from "react-redux";
import {EVENT_REDUX_DEV_TOOLS_ENABLED} from "../lib/ipc-constants";
import {invoke} from "../lib/ipc/renderer";
import getThemeConfiguration from "../lib/rpc/get-theme-configuration/app";
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

function ColourModeController(): ReactElement {
    const {data: themeConfig} = useThemeConfiguration();
    const {setColorMode} = useColorMode();

    useEffect(() => {
        if (themeConfig) {
            setColorMode(themeConfig.colourMode);
        }
    }, [themeConfig?.colourMode]);

    return null;
}

export const Root: FC = () => {
    const devToolsEnabled = useAsync(getDevToolsEnabled, []);
    const {
        result: initialThemeConfig,
        error: initialThemeConfigError
    } = useAsync(getThemeConfiguration, []);

    const theme = useMemo(
        () =>
            createTheme({
                config: {
                    initialColorMode:
                        initialThemeConfig?.colourMode === "system"
                            ? "dark"
                            : initialThemeConfig?.colourMode ?? "dark",
                    useSystemColorMode:
                        initialThemeConfig?.colourMode === "system"
                }
            }),
        [initialThemeConfig?.colourMode]
    );

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
                <ChakraProvider theme={theme}>
                    <ColourModeController />
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
                </ChakraProvider>
            </RpcConfigurator>
            {devToolsEnabled.result &&
                process.env.NODE_ENV === "development" && <DevTools />}
        </ReduxProvider>
    );
};
