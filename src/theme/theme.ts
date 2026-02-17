// file: src/theme/theme.ts

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

const STORAGE_KEY = "nefcode.theme";

/**
 * Read stored theme preference.
 * Returns "system" if missing/invalid.
 */
export function readThemePreference(): ThemePreference {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    return "system";
}

/**
 * Persist theme preference.
 */
export function writeThemePreference(pref: ThemePreference): void {
    localStorage.setItem(STORAGE_KEY, pref);
}

/**
 * Resolve effective mode based on preference + system.
 */
export function resolveThemeMode(pref: ThemePreference): ThemeMode {
    if (pref === "light" || pref === "dark") return pref;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    return mql.matches ? "dark" : "light";
}

/**
 * Apply the effective theme mode by setting data-theme on <html>.
 * Invariant: mode is "light" or "dark".
 */
export function applyThemeMode(mode: ThemeMode): void {
    document.documentElement.dataset.theme = mode;
}
