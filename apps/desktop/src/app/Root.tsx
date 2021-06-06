import {ChakraProvider, ColorModeScript} from "@chakra-ui/react";
import React, {FC, ReactNode} from "react";
import {useAsync} from "react-async-hook";
import {Provider as ReduxProvider} from "react-redux";
import {EVENT_REDUX_DEV_TOOLS_ENABLED} from "../lib/ipc-constants";
import {invoke} from "../lib/ipc/renderer";
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
import store from "./store";
import {useAppSelector} from "./store-hooks";
import theme from "./theme";

const getDevToolsEnabled = () => invoke(EVENT_REDUX_DEV_TOOLS_ENABLED);

function WhenInitialised({children}: {children: ReactNode}) {
    const isInitialised = useAppSelector(state => state.loadState.value);

    if (!isInitialised) return null;
    return <>{children}</>;
}

export const Root: FC = () => {
    const devToolsEnabled = useAsync(getDevToolsEnabled, []);

    return (
        <ReduxProvider store={store}>
            <RpcConfigurator refreshInterval={1000} instantCallThreshold={100}>
                <ChakraProvider theme={theme}>
                    <ColorModeScript initialColorMode="system" />
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
