import {useColorModeValue} from "@chakra-ui/react";

export default function useThemeColours() {
    const text = useColorModeValue("gray.900", "white");

    const backgroundL0 = useColorModeValue("white", "black");
    const backgroundL1 = useColorModeValue("white", "gray.900");
    const backgroundL2 = useColorModeValue("gray.100", "gray.800");

    return {text, backgroundL0, backgroundL1, backgroundL2};
}
