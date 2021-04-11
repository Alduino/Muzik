import React, {FC} from "react";
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

const getDevToolsEnabled = () => invoke(EVENT_REDUX_DEV_TOOLS_ENABLED);

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
                        <AudioController />
                        <MediaSessionController />
                        <App />
                    </AudioControllerProvider>
                </ColorModeProvider>
            </ChakraProvider>
            {devToolsEnabled.result &&
                process.env.NODE_ENV === "development" && <DevTools />}
        </ReduxProvider>
    );
};
