import {join} from "path";
import {app, BrowserWindow} from "electron";
import {initialiseMuzik} from "./initialise.ts";
import {attachWindow, detachWindow} from "./ipc-setup.ts";
import {prisma} from "./prisma.ts";

try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {default: shouldQuit} = require("electron-squirrel-startup");

    if (shouldQuit) {
        console.log("Quitting from Squirrel!");
        app.quit();
    }
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

    attachWindow(mainWindow);
    mainWindow.setMenuBarVisibility(false);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        console.log("Loading dev server from", MAIN_WINDOW_VITE_DEV_SERVER_URL);
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

app.whenReady()
    .then(createWindow)
    .catch(err => {
        console.error("Fatal Error:", err);
        app.quit();
    });

app.whenReady().then(initialiseMuzik);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        console.log("Quitting!");
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        return createWindow();
    }
});

app.on("before-quit", async () => {
    await prisma.$disconnect();
});
