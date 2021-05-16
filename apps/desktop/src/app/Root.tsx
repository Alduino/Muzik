import React, {FC, ReactNode} from "react";
import {Provider as ReduxProvider} from "react-redux";
import {ChakraProvider, ColorModeProvider} from "@chakra-ui/react";
import {useAsync} from "react-async-hook";
import {App} from "./components/App";
import store from "./store";
import {DevTools} from "./DevTools";
import theme from "./theme";
import {
    AudioController,
    AudioControllerProvider,
    MediaSessionController
} from "./components/lib/AudioController";
import {invoke} from "../lib/ipc/renderer";
import {EVENT_REDUX_DEV_TOOLS_ENABLED} from "../lib/ipc-constants";
import {ContextMenuProvider} from "./components/lib/ContextMenu";
import {TitleController} from "./components/lib/TitleController";
import {StoreSaver} from "./components/lib/StoreSaver";
import {CustomScrollProvider} from "./components/lib/CustomScrollProvider";
import {useAppSelector} from "./store-hooks";

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
