import {join} from "path";
import {app, BrowserWindow} from "electron";
import {attachWindow, detachWindow} from "./ipc-setup";

try {
    if (require("electron-squirrel-startup")) app.quit();
} catch {
    console.warn("Couldn't import electron-squirrel-startup");
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: join(__dirname, "preload.js")
        }
    });

    mainWindow.setMenuBarVisibility(false);
    attachWindow(mainWindow);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        const path = join(
            __dirname,
            `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
        );

        await mainWindow.loadFile(path);
    }

    if (process.env.NODE_ENV === "development") {
        console.log("Installing devtools");

        const {default: installExtension, REACT_DEVELOPER_TOOLS} = await import(
            "electron-devtools-installer"
        );

        await installExtension(REACT_DEVELOPER_TOOLS, {
            loadExtensionOptions: {
                allowFileAccess: true
            }
        });

        mainWindow.webContents.openDevTools();
    }

    mainWindow.once("closed", () => {
        detachWindow(mainWindow);
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
