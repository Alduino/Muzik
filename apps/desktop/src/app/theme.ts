import {extendTheme, ThemeOverride} from "@chakra-ui/react";
import "@fontsource/montserrat";
import "@fontsource/lato";

const createTheme = (ex: ThemeOverride): ReturnType<typeof extendTheme> =>
    extendTheme({
        fonts: {
            ...ex.fonts,
            heading: "Montserrat",
            body: "Lato"
        },
        ...ex
    });

export default createTheme;
