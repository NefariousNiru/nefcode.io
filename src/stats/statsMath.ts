// file: src/stats/statsMath.ts

export type SummaryStats = {
	readonly n: number;
	readonly min: number | null;
	readonly max: number | null;
	readonly avg: number | null;
	readonly p50: number | null;
	readonly p95: number | null;
	readonly p99: number | null;
	/** Mode of bucketed values (rounded to bucketSize). */
	readonly mode: number | null;
};

function quantileSorted(sorted: readonly number[], q: number): number | null {
	if (sorted.length === 0) return null;
	const idx = (sorted.length - 1) * q;
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	if (lo === hi) return sorted[lo] ?? null;
	const a = sorted[lo] ?? 0;
	const b = sorted[hi] ?? 0;
	return a + (b - a) * (idx - lo);
}

export function summarize(
	values: readonly number[],
	bucketSize = 5,
): SummaryStats {
	const clean = values.filter((x) => Number.isFinite(x));
	if (clean.length === 0) {
		return {
			n: 0,
			min: null,
			max: null,
			avg: null,
			p50: null,
			p95: null,
			p99: null,
			mode: null,
		};
	}

	const sorted = [...clean].sort((a, b) => a - b);
	const min = sorted[0] ?? null;
	const max = sorted[sorted.length - 1] ?? null;

	let sum = 0;
	for (const v of sorted) sum += v;
	const avg = sum / sorted.length;

	// mode of bucketed values
	const counts = new Map<number, number>();
	let bestBucket: number | null = null;
	let bestCount = -1;

	for (const v of sorted) {
		const bucket = Math.round(v / bucketSize) * bucketSize;
		const next = (counts.get(bucket) ?? 0) + 1;
		counts.set(bucket, next);
		if (next > bestCount) {
			bestCount = next;
			bestBucket = bucket;
		}
	}

	return {
		n: sorted.length,
		min,
		max,
		avg,
		p50: quantileSorted(sorted, 0.5),
		p95: quantileSorted(sorted, 0.95),
		p99: quantileSorted(sorted, 0.99),
		mode: bestBucket,
	};
}

export type HistogramBin = {
	readonly label: string;
	readonly count: number;
};

export function histogram(args: {
	readonly values: readonly number[];
	readonly bucketSize: number;
	readonly maxBuckets: number;
}): readonly HistogramBin[] {
	const { values, bucketSize, maxBuckets } = args;

	const clean = values.filter((x) => Number.isFinite(x) && x >= 0);
	if (clean.length === 0) return [];

	const buckets = new Map<number, number>();
	for (const v of clean) {
		const b = Math.floor(v / bucketSize) * bucketSize;
		buckets.set(b, (buckets.get(b) ?? 0) + 1);
	}

	const keys = [...buckets.keys()].sort((a, b) => a - b).slice(0, maxBuckets);
	return keys.map((k) => ({
		label: `${k}-${k + bucketSize}`,
		count: buckets.get(k) ?? 0,
	}));
}
