// file: src/domain/types.ts

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type ManifestFile = {
    /** Display name for UI (best-effort, can be derived from filename). */
    readonly name: string;
    /**
     * Relative URL inside GitHub Pages, no leading slash.
     * Example: "data/Amazon/5.%20All.csv"
     */
    readonly url: string;

    /** Optional metadata from builder; may be inaccurate. */
    readonly rows?: number;
};

export type ManifestCompany = {
    readonly name: string;
    readonly files: readonly ManifestFile[];
};

export type Manifest = {
    /** ISO string if available, otherwise empty string. */
    readonly generatedAt: string;
    readonly companies: readonly ManifestCompany[];
};

export type CsvRowRaw = {
    readonly Difficulty?: string;
    readonly Title?: string;
    readonly Frequency?: string;
    readonly "Acceptance Rate"?: string;
    readonly Link?: string;
    readonly Topics?: string;
};

export type ProblemRow = {
    readonly difficulty: Difficulty;
    readonly title: string;
    readonly frequency: number;
    /** 0..1 */
    readonly acceptanceRate: number | null;
    /** Canonical key (global identity) */
    readonly link: string;
    readonly topics: readonly string[];
};
