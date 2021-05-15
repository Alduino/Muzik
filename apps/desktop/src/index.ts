import {app, BrowserWindow} from "electron";
import {DEVTOOL_REACT, installDevtool} from "./devtool-installer";
import "./node";
import {registerWC} from "./lib/ipc/main";
import {Target} from "./lib/window-ids";

try {
    if (require("electron-squirrel-startup")) app.quit();
} catch {
    console.warn("Couldn't import electron-squirrel-startup");
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: any;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: any;

const createWindow = async () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
        }
    });

    mainWindow.setMenuBarVisibility(false);
    registerWC(Target.main, mainWindow.webContents);

    // and load the index.html of the app.
    await mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    if (process.env.NODE_ENV !== "production") {
        console.log("installing");
        await installDevtool(DEVTOOL_REACT);

        // wait for a bit
        await new Promise(yay => setTimeout(yay, 1000));

        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
