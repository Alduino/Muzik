function readPackage(pkg, context) {
    if (pkg.dependencies["app-builder-bin"]) {
        context.log("Replacing app-builder-bin in " + pkg.name);
        delete pkg.dependencies["app-builder-bin"];
        pkg.dependencies["@alduino/app-builder-bin"] = "^4.0.1";
    }

    return pkg;
}


module.exports = {
    hooks: {
        readPackage
    }
};
