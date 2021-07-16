import {nativeTheme} from "electron";
import {store} from "./configuration";

export default function updateColourMode(): void {
    nativeTheme.themeSource = store.get(
        "themeConfiguration.colourMode",
        "system"
    );
}
