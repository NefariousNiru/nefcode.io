// file: src/theme/useTheme.tsx

import {createContext, useContext} from "react";
import type {ThemeMode, ThemePreference} from "./theme.ts";

export type ThemeContextValue = {
    readonly preference: ThemePreference;
    readonly mode: ThemeMode;
    readonly setPreference: (pref: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
    const v = useContext(ThemeContext);
    if (!v) throw new Error("useTheme must be used within ThemeProvider");
    return v;
}