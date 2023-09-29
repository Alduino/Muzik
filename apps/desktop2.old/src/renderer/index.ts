import {createElement} from "react";
import {createRoot} from "react-dom/client";
import {Main} from "./Main.tsx";
import "./utils/i18n.tsx";

import "./global.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(createElement(Main));
