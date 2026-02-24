// file: src/utils/timeUtils.ts

export function dayKeyLocal(ts: number): string {
	const d = new Date(ts);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

export function weekKeyLocal(ts: number): string {
	// Monday-start week key: YYYY-MM-DD of the Monday
	const d = new Date(ts);
	const day = d.getDay(); // 0=Sun
	const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
	d.setDate(d.getDate() + diff);

	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

export function computeStreaks(dayKeys: readonly string[]): {
	readonly current: number;
	readonly longest: number;
	readonly activeDays30: number;
} {
	const set = new Set(dayKeys);

	// active days last 30
	const now = new Date();
	const day30 = new Date(now);
	day30.setDate(day30.getDate() - 29);

	let active30 = 0;
	for (let i = 0; i < 30; i += 1) {
		const d = new Date(day30);
		d.setDate(day30.getDate() + i);
		const k = dayKeyLocal(d.getTime());
		if (set.has(k)) active30 += 1;
	}

	// current streak
	let current = 0;
	{
		const d = new Date();
		for (;;) {
			const k = dayKeyLocal(d.getTime());
			if (!set.has(k)) break;
			current += 1;
			d.setDate(d.getDate() - 1);
		}
	}

	// longest streak
	const sorted = [...set].sort(); // YYYY-MM-DD lexical works
	let longest = 0;
	let run = 0;
	let prev: Date | null = null;

	for (const k of sorted) {
		const d = new Date(`${k}T00:00:00`);
		if (!prev) {
			run = 1;
			longest = Math.max(longest, run);
			prev = d;
			continue;
		}

		const next = new Date(prev);
		next.setDate(next.getDate() + 1);

		if (dayKeyLocal(next.getTime()) === k) run += 1;
		else run = 1;

		longest = Math.max(longest, run);
		prev = d;
	}

	return { current, longest, activeDays30: active30 };
}
