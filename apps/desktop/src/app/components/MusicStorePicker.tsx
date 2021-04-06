import {Button, Center, Text} from "@chakra-ui/react";
import React, {FC} from "react";
import {HeadedFloat} from "./lib/HeadedFloat";
import {invoke} from "../../lib/ipc/renderer";
import {
    EVENT_MUSIC_IMPORT,
    EVENT_SELECT_MUSIC_IMPORT_PATH,
    MusicImportRequest
} from "../../lib/ipc-constants";
import {useAsyncCallback} from "react-async-hook";
import store from "../store";
import {GlobalRoute, setGlobalRoute} from "../reducers/routing";

const invokeMusicPathSelector = async () => {
    const success = await invoke(EVENT_SELECT_MUSIC_IMPORT_PATH);
    if (!success) return;

    await invoke<void, MusicImportRequest>(EVENT_MUSIC_IMPORT, {
        progressFrequency: 10
    });

    store.dispatch(setGlobalRoute(GlobalRoute.albumListing));
};

export const MusicStorePicker: FC = () => {
    const invoker = useAsyncCallback(invokeMusicPathSelector);

    return (
        <Center flex={1}>
            <HeadedFloat header="Music store location">
                <Text>Please select where your music is located.</Text>
                <Button
                    colorScheme="blue"
                    onClick={invoker.execute}
                    isLoading={invoker.loading}
                    loadingText="Waiting..."
                >
                    Select
                </Button>
            </HeadedFloat>
        </Center>
    );
};
