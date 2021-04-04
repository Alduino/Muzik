import "regenerator-runtime/runtime";
import isDev from "electron-is-dev";
import {app, BrowserWindow} from "electron";
import {join} from "path";
import onAutoreload from "@muzik/rollup-plugin-autoreload/runtime";

let mainWindow: BrowserWindow | null;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: `${__dirname}/preload.js`
        }
    });

    if (isDev) {
        await mainWindow.loadURL("http://localhost:3000");
    } else {
        await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (mainWindow === null) return createWindow();
});

onAutoreload(() => {
    if (mainWindow !== null) {
        console.log("Reloading");
        mainWindow.reload();
    }
});

export {};
