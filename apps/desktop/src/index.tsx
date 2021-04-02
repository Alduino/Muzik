import React from "react";
import {Renderer} from "@nodegui/react-nodegui";
import {App} from "./app";

process.title = "Muzak";

Renderer.render(<App />);

// @ts-ignore
if (module.hot) module.hot.accept("./app", () => Renderer.forceUpdate());
