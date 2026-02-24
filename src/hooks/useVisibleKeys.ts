// file: src/hooks/useVisibleKeys.ts

import { useCallback, useEffect, useRef, useState } from "react";

type UseVisibleKeysArgs = {
	/** How much of the row must be visible before we count it as visible. */
	readonly threshold?: number;
	/** Optional: expand viewport by this margin (e.g. "200px 0px"). */
	readonly rootMargin?: string;
};

/**
 * useVisibleKeys
 * Tracks which keys are visible on screen using IntersectionObserver.
 *
 * Usage:
 * - const { visibleKeys, observe } = useVisibleKeys()
 * - <div ref={observe(key)}>...</div>
 */
export function useVisibleKeys(args: UseVisibleKeysArgs = {}): {
	readonly visibleKeys: readonly string[];
	readonly observe: (key: string) => (el: Element | null) => void;
} {
	const { threshold = 0.15, rootMargin = "200px 0px" } = args;

	const [visibleSet, setVisibleSet] = useState<Set<string>>(() => new Set());

	const keyByEl = useRef(new Map<Element, string>());
	const observerRef = useRef<IntersectionObserver | null>(null);

	useEffect(() => {
		const obs = new IntersectionObserver(
			(entries) => {
				setVisibleSet((prev) => {
					let changed = false;
					const next = new Set(prev);

					for (const e of entries) {
						const key = keyByEl.current.get(e.target);
						if (!key) continue;

						if (e.isIntersecting) {
							if (!next.has(key)) {
								next.add(key);
								changed = true;
							}
						} else {
							if (next.delete(key)) changed = true;
						}
					}

					return changed ? next : prev;
				});
			},
			{ threshold, rootMargin },
		);

		observerRef.current = obs;
		return () => {
			obs.disconnect();
			observerRef.current = null;
			keyByEl.current.clear();
		};
	}, [threshold, rootMargin]);

	const observe = useCallback((key: string) => {
		return (el: Element | null) => {
			const obs = observerRef.current;
			if (!obs) return;

			// Unobserve any previous element mapped to this key (rare, but safe)
			for (const [oldEl, oldKey] of keyByEl.current.entries()) {
				if (oldKey === key && oldEl !== el) {
					obs.unobserve(oldEl);
					keyByEl.current.delete(oldEl);
				}
			}

			if (!el) return;

			keyByEl.current.set(el, key);
			obs.observe(el);
		};
	}, []);

	const visibleKeys = Array.from(visibleSet);

	return { visibleKeys, observe };
}
