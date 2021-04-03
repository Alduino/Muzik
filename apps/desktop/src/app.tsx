import React, {FC} from "react";
import {View, Window, Text} from "@nodegui/react-nodegui";
import {useAsync} from "react-async-hook";
import promiseAllObject from "./utils/promiseAllObject";
import initialise from "./initialiser";
import {SplashScreen} from "./components/SplashScreen";

const init = async () => promiseAllObject(initialise());

export const App: FC = () => {
    const {result, loading} = useAsync(init, []);

    if (loading) {
        return <SplashScreen />;
    }

    return (
        <Window windowTitle="Hello world">
            <View>
                <Text>Hello!</Text>
            </View>
        </Window>
    );
};
