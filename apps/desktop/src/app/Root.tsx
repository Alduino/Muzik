import {ChakraProvider, ColorModeProvider} from "@chakra-ui/react";
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
            <ChakraProvider theme={theme}>
                <ColorModeProvider
                    options={{
                        initialColorMode: "light",
                        useSystemColorMode: true
                    }}
                >
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
                </ColorModeProvider>
            </ChakraProvider>
            {devToolsEnabled.result &&
                process.env.NODE_ENV === "development" && <DevTools />}
        </ReduxProvider>
    );
};
