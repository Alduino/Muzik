import {startAudioPlaybackEngine} from "./core/orchestrator.ts";
import {migrateDatabase} from "./init/migration.ts";
import {registerCustomProtocols} from "./protocols";
import {markInitialisationComplete} from "./router/meta/init.ts";
import {configDb} from "./utils/config.ts";
import {initialiseFfmpeg} from "./utils/ffmpeg.ts";

export async function initialiseMuzik() {
    registerCustomProtocols();
    await configDb.read();
    await migrateDatabase();
    await initialiseFfmpeg();
    await startAudioPlaybackEngine();
    markInitialisationComplete();
}
