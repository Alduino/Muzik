import React, {FC} from "react";
import {View, Window, Text} from "@nodegui/react-nodegui";

export const App: FC = () => (
    <Window windowTitle="Hello world">
        <View>
            <Text>Hello!</Text>
        </View>
    </Window>
);
