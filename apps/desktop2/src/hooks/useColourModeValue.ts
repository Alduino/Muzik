import {useEffect, useState} from "react";

const lightMediaQuery = window.matchMedia("(prefers-color-scheme: light)");
const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function useColourModeValue<Light, Dark>(
    light: Light,
    dark: Dark,
    system: Light | Dark = light
): Light | Dark {
    const [colourMode, setColourMode] = useState<"light" | "dark" | "system">(
        "system"
    );

    useEffect(() => {
        const listener = () => {
            if (lightMediaQuery.matches) setColourMode("light");
            else if (darkMediaQuery.matches) setColourMode("dark");
            else setColourMode("system");
        };

        lightMediaQuery.addEventListener("change", listener);
        darkMediaQuery.addEventListener("change", listener);

        return () => {
            lightMediaQuery.removeEventListener("change", listener);
            darkMediaQuery.removeEventListener("change", listener);
        };
    }, []);

    switch (colourMode) {
        case "light":
            return light;
        case "dark":
            return dark;
        case "system":
            return system;
    }
}
