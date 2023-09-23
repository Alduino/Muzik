import {Plugin} from "vite";

const fileRegex = /\.ftl$/;

export default function ftl(): Plugin {
    return {
        name: "ftl",
        transform(src, id) {
            if (!fileRegex.test(id)) return;

            return `import {FluentResource} from "@fluent/bundle";
export default new FluentResource(${JSON.stringify(src)});`;
        }
    };
}
