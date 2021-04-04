// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const fs = require("fs");

// eslint-disable-next-line no-undef
window.node = {
    fs: {
        readdirSync: fs.readdirSync,
        readFileSync: fs.readFileSync
    }
};
