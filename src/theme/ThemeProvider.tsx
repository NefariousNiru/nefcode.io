// file: src/theme/ThemeProvider.tsx

import {useEffect, useMemo, useState} from "react";
import {
    applyThemeMode,
    readThemePreference,
    resolveThemeMode,
    writeThemePreference,
    type ThemePreference,
} from "./theme";
import {ThemeContext, type ThemeContextValue} from "./useTheme";
import * as React from "react";


type Props = {
    readonly children: React.ReactNode;
};

export function ThemeProvider({children}: Props) {
    const [preference, setPreferenceState] = useState<ThemePreference>(() => readThemePreference());
    const mode = useMemo(() => resolveThemeMode(preference), [preference]);

    useEffect(() => {
        applyThemeMode(mode);
    }, [mode]);

    useEffect(() => {
        // If user chose system, track system changes live
        if (preference !== "system") return;

        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => applyThemeMode(mql.matches ? "dark" : "light");

        // Apply once on subscribe
        onChange();

        mql.addEventListener("change", onChange);
        return () => {
            mql.removeEventListener("change", onChange);
        };
    }, [preference]);

    const setPreference = (pref: ThemePreference) => {
        writeThemePreference(pref);
        setPreferenceState(pref);
    };

    const value: ThemeContextValue = {preference, mode, setPreference};

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
