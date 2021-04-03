import {Image, Window} from "@nodegui/react-nodegui";
import React, {FC} from "react";
import splash from "../../assets/splash.png";

export const SplashScreen: FC = () => (
    <Window
        minSize={{width: 800, height: 500}}
        maxSize={{width: 800, height: 500}}
    >
        <Image src={splash} />
    </Window>
);
