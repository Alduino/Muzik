import {extendTheme, ThemeOverride} from "@chakra-ui/react";
import "@fontsource/inter/variable.css";

const createTheme = (ex: ThemeOverride): ReturnType<typeof extendTheme> =>
    extendTheme({
        fonts: {
            ...ex.fonts,
            heading: "InterVariable",
            body: "InterVariable"
        },
        ...ex
    });

export default createTheme;
