/* eslint-disable @typescript-eslint/no-var-requires */

const {chmodSync} = require("fs");
const {appBuilderPath} = require("app-builder-bin");

// In v4.2.0, the app builder binary isn't set as executable.
// See https://github.com/develar/app-builder/issues/97.
chmodSync(appBuilderPath, "755");
