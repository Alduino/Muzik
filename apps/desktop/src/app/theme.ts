import {extendTheme} from "@chakra-ui/react";
import "@fontsource/montserrat";
import "@fontsource/lato";

const theme = extendTheme({
    fonts: {
        heading: "Montserrat",
        body: "Lato"
    }
});

export default theme;
