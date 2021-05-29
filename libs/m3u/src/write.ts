import {FileHandle, open} from "fs/promises";
import {Playlist} from "./playlist";

async function writeDirective(
    file: FileHandle,
    name: string,
    argument?: string
) {
    const str = argument ? `#${name}: ${argument}\n` : `#${name}\n`;
    await file.write(str);
}

async function writeTrack(file: FileHandle, path: string) {
    await file.write(path + "\n");
}

export async function writeFile(
    path: string,
    playlist: Playlist
): Promise<void> {
    const file = await open(path, "w");
    await writeDirective(file, "EXTM3U");
    await writeDirective(file, "EXTENC", "UTF-8");
    await writeDirective(file, "PLAYLIST", playlist.title);

    if (playlist.coverImagePath) {
        await writeDirective(file, "EXTIMG", "front cover");
        await writeTrack(file, playlist.coverImagePath);
    }

    for (const track of playlist.trackPaths) {
        await writeTrack(file, track);
    }
}
