import React from "react";
import {Renderer} from "@nodegui/react-nodegui";
import {App} from "./app";

process.title = "Muzak";

Renderer.render(<App />);

// @ts-ignore
if (module.hot) {
    console.log("Using HMR");

    // @ts-ignore
    module.hot.accept("./app", () => Renderer.forceUpdate());
}
