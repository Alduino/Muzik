import path from "node:path";
import {app, BrowserWindow, Menu, MenuItem} from "electron";
import {log} from "../shared/logger.ts";
import {terminateWorker as terminateAudioWorker} from "./main/core/worker.ts";
import {initialiseMuzik} from "./main/initialise.ts";
import {attachWindow, detachWindow} from "./main/ipc-setup.ts";
import {prisma} from "./main/prisma.ts";
import {tempDir} from "./main/utils/tmp-dir.ts";

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
    ? process.env.DIST
    : path.join(process.env.DIST, "../public");

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

Menu.setApplicationMenu(
    Menu.buildFromTemplate([
        new MenuItem({
            accelerator: "Ctrl+Shift+I",
            click() {
                win?.webContents.toggleDevTools();
            }
        })
    ])
);

app.commandLine.appendSwitch("enable-features", "OverlayScrollbar");

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    win.setMenuBarVisibility(false);
    win.hide();

    attachWindow(win);

    // Test active push message to Renderer-process.
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send(
            "main-process-message",
            new Date().toLocaleString()
        );
    });

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST, "index.html"));
    }

    if (VITE_DEV_SERVER_URL) {
        win.showInactive();
    }

    const _win = win;
    win.once("closed", () => {
        detachWindow(_win);
    });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
        win = null;
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.once("before-quit", async ev => {
    ev.preventDefault();

    try {
        log.info("Shutting down");

        log.debug("Cleaning up temporary files");
        tempDir.cleanupSync();

        log.debug("Terminating audio worker");
        await terminateAudioWorker();

        log.debug("Disconnecting from database");
        await prisma.$executeRawUnsafe("VACUUM");
        await prisma.$disconnect();
    } catch (err) {
        log.warn(err, "Failed to properly clean up");
    } finally {
        log.debug("Quitting");
        app.quit();
    }
});

app.whenReady().then(createWindow);

app.whenReady()
    .then(initialiseMuzik)
    .catch(err => {
        log.fatal(err, "Failed to initialise Muzik");
        app.quit();
    });
