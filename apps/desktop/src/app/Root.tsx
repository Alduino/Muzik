import React, {FC} from "react";
import {Provider as ReduxProvider} from "react-redux";
import {ChakraProvider, ColorModeProvider} from "@chakra-ui/react";
import {App} from "./components/App";
import store from "./store";
import {DevTools} from "./DevTools";
import theme from "./theme";

export const Root: FC = () => (
    <ReduxProvider store={store}>
        <ChakraProvider theme={theme}>
            <ColorModeProvider
                options={{
                    initialColorMode: "light",
                    useSystemColorMode: true
                }}
            >
                <App />
            </ColorModeProvider>
        </ChakraProvider>
        <DevTools />
    </ReduxProvider>
);
