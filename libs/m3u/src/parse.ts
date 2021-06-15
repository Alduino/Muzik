import {createReadStream} from "fs";
import {basename, extname} from "path";
import {createInterface} from "readline";
import {Playlist} from "./playlist";

interface Directive {
    type: "directive";
    name: string;
    consumesNextLine: boolean;
    argument?: string;
}

interface Track {
    type: "track";
    path: string;
}

function checkConsumesNextLine(name: string) {
    return ["EXTINF", "EXTIMG"].includes(name);
}

function parseDirective(directive: string): Directive {
    const colonIndex = directive.indexOf(":");
    if (colonIndex === -1)
        return {
            type: "directive",
            name: directive,
            consumesNextLine: checkConsumesNextLine(directive)
        };
    const name = directive.substring(0, colonIndex).trim();
    return {
        type: "directive",
        name,
        argument: directive.substring(colonIndex + 1).trim(),
        consumesNextLine: checkConsumesNextLine(name)
    };
}

function parseLine(line: string): Directive | Track | null {
    line = line.trim();
    if (!line) return null;
    if (line.startsWith("#EXT") || line.startsWith("#PLAYLIST"))
        return parseDirective(line.substring("#".length));
    if (line.startsWith("#")) return null;
    return {type: "track", path: line};
}

function getTitleFromFileName(path: string) {
    return basename(path, extname(basename(path)));
}

function getDirective(
    list: {directive: Directive; track?: Track}[],
    name: string,
    argument?: string
) {
    return list.find(
        v =>
            v.directive.name === name &&
            (argument ? v.directive.argument === argument : true)
    );
}

function getDirectives(
    list: {directive: Directive; track?: Track}[],
    name: string
) {
    return list.filter(v => v.directive.name === name);
}

export async function parseFile(path: string): Promise<Playlist> {
    const stream = createReadStream(path);
    const lines = createInterface(stream);

    const directives: {directive: Directive; track?: Track}[] = [];
    const trackPaths: string[] = [];

    let nextLineConsumed = false;
    for await (const line of lines) {
        const res = parseLine(line);
        if (res === null) continue;

        if (res.type === "track") {
            if (nextLineConsumed) {
                nextLineConsumed = false;
                directives[directives.length - 1].track = res;
            } else {
                trackPaths.push(res.path);
            }
        } else if (res.type === "directive") {
            directives.push({directive: res});
            nextLineConsumed = res.consumesNextLine;
        }
    }

    const title =
        getDirective(directives, "PLAYLIST")?.directive.argument ??
        getTitleFromFileName(path);

    const coverImagePath = getDirective(directives, "EXTIMG", "front cover")
        ?.track?.path;

    const allTrackPaths = [
        ...trackPaths,
        ...getDirectives(directives, "EXTINF")
            .filter(v => v.track)
            .map(el => (el.track as Track).path)
    ];

    return {
        title,
        coverImagePath,
        trackPaths: allTrackPaths
    };
}
