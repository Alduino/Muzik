import "regenerator-runtime/runtime";
import React from "react";
import {Renderer} from "@nodegui/react-nodegui";
import {App} from "./app";

process.title = "Muzak";

Renderer.render(<App />);

if (module.hot) {
    console.log("Using HMR");

    module.hot.accept("./app", () => Renderer.forceUpdate());
}
