import {useColorModeValue} from "@chakra-ui/react";

interface ThemeColours {
    border: string;
    text: string;
    invertTheme: {filter?: string};
    invertThemeReverse: {filter?: string};
    translucentHoverBg: string;
    translucentActiveBg: string;
    backgroundL0: string;
    backgroundL1: string;
    backgroundL2: string;
    backgroundL3: string;
    active: string;
}

export default function useThemeColours(): ThemeColours {
    const text = useColorModeValue("gray.900", "white");

    const backgroundL0 = useColorModeValue("white", "black");
    const backgroundL1 = useColorModeValue("gray.50", "gray.900");
    const backgroundL2 = useColorModeValue("gray.100", "gray.800");
    const backgroundL3 = useColorModeValue("gray.200", "gray.700");

    const border = useColorModeValue("gray.200", "gray.700");

    const invertTheme = useColorModeValue({}, {filter: "invert()"});
    const invertThemeReverse = useColorModeValue({filter: "invert()"}, {});

    const translucentHoverBg = useColorModeValue("#0001", "#fff1");
    const translucentActiveBg = useColorModeValue("#0002", "#fff2");

    const active = useColorModeValue("blue.700", "blue.200");

    return {
        border,
        text,
        invertTheme,
        invertThemeReverse,
        translucentHoverBg,
        translucentActiveBg,
        backgroundL0,
        backgroundL1,
        backgroundL2,
        backgroundL3,
        active
    };
}
