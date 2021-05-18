import {createDevTools} from "@redux-devtools/core";
import DockMonitor from "@redux-devtools/dock-monitor";
import LogMonitor from "@redux-devtools/log-monitor";
import React from "react";

export const DevTools = createDevTools(
    <DockMonitor
        toggleVisibilityKey="ctrl-h"
        changePositionKey="ctrl-q"
        defaultIsVisible={true}
    >
        <LogMonitor theme="tomorrow" />
    </DockMonitor>
);
