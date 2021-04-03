import "regenerator-runtime/runtime";
import React from "react";
import {Renderer} from "@nodegui/react-nodegui";
import {App} from "./app";

process.title = "Muzak";

Renderer.render(<App />);

// Webpack's typescript doesn't like this for some reason
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const hot = module.hot;

if (hot) {
    console.log("Using HMR");
    hot.accept("./app", () => Renderer.forceUpdate());
}
