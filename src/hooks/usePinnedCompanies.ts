// file: src/hooks/usePinnedCompanies.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { readPrefs, writePinnedCompanies } from "../storage/prefs.ts";

export type UsePinnedCompanies = {
	readonly pinned: readonly string[];
	readonly pinnedSet: ReadonlySet<string>;
	readonly setPinned: (next: readonly string[]) => void;
};

/**
 * React wrapper around localStorage pins.
 * - Reads once at mount
 * - Writes through to localStorage
 * - Updates local state immediately (no reload)
 * - Syncs across tabs via `storage` event
 */
export function usePinnedCompanies(): UsePinnedCompanies {
	const [pinned, setPinnedState] = useState<readonly string[]>(() => {
		return readPrefs().pinnedCompanies;
	});

	const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

	const setPinned = useCallback((next: readonly string[]) => {
		writePinnedCompanies(next);
		setPinnedState(next);
	}, []);

	useEffect(() => {
		const onStorage = (e: StorageEvent) => {
			// If pins changed in another tab, refresh local state.
			if (!e.key) return;

			// prefs.ts uses KEY_PINS internally, we can just re-read snapshot.
			// cheap + avoids coupling to key string.
			const snap = readPrefs();
			setPinnedState(snap.pinnedCompanies);
		};

		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	return { pinned, pinnedSet, setPinned };
}
