// scripts/build-manifest.mjs
//
// Purpose
// - Copy repo ./data -> ./public/data so Vite will ship CSVs into the final dist output.
// - Generate ./public/manifest.json by scanning ./data for *.csv files.
// - Use deterministic csv_id values so React can reference lists reliably.
//
// Why copy into public/?
// - Vite copies everything from ./public into dist unchanged.
// - This keeps deployment simple: GitHub Pages serves dist, and dist contains the CSVs and manifest.
//
// GitHub Pages gotcha
// - Repo pages are served under /<repo>/, not /
// - So manifest URLs MUST be relative like "data/Amazon/1.%20Thirty%20Days.csv"
//   (not "/data/..."), otherwise they break on Pages.

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

const DATA_DIR = path.join(REPO_ROOT, "data");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");
const PUBLIC_DATA_DIR = path.join(PUBLIC_DIR, "data");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "manifest.json");

function ensureDir(p) {
	fs.mkdirSync(p, { recursive: true });
}

function isCsv(filePath) {
	return filePath.toLowerCase().endsWith(".csv");
}

/**
 * Convert a string into a stable slug for ids.
 * Example:
 *  "1. Thirty Days" -> "1-thirty-days"
 *  "More Than Six Months" -> "more-than-six-months"
 */
function slugify(s) {
	return s
		.trim()
		.toLowerCase()
		.replace(/\.csv$/i, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Recursively list all files under a directory.
 */
function walk(dir) {
	const out = [];
	const items = fs.readdirSync(dir, { withFileTypes: true });
	for (const it of items) {
		const p = path.join(dir, it.name);
		if (it.isDirectory()) out.push(...walk(p));
		else out.push(p);
	}
	return out;
}

/**
 * Fast row count for dashboards and sanity checks.
 * We count non-empty lines minus 1 header line.
 * This is "good enough" and avoids expensive CSV parsing in CI.
 */
function countRows(csvPath) {
	const txt = fs.readFileSync(csvPath, "utf8");
	const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
	if (lines.length <= 1) return 0;
	return lines.length - 1;
}

/**
 * Remove a directory if it exists.
 * Used so deletions in ./data are reflected in ./public/data.
 */
function rmDirIfExists(p) {
	if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

/**
 * Copy a directory recursively.
 * Node has fs.cpSync, but this explicit implementation is predictable and portable.
 */
function copyDir(src, dst) {
	ensureDir(dst);
	const items = fs.readdirSync(src, { withFileTypes: true });
	for (const it of items) {
		const sp = path.join(src, it.name);
		const dp = path.join(dst, it.name);
		if (it.isDirectory()) copyDir(sp, dp);
		else fs.copyFileSync(sp, dp);
	}
}

/**
 * Convert a relative path like:
 *   Accolite/1. Thirty Days.csv
 * into a URL-safe path like:
 *   data/Accolite/1.%20Thirty%20Days.csv
 *
 * IMPORTANT: no leading "/" so it works on GitHub Pages repo sites.
 */
function toRelativeUrlFromData(relFromData) {
	const parts = relFromData.split(path.sep).map(encodeURIComponent);
	return `data/${parts.join("/")}`;
}

function main() {
	if (!fs.existsSync(DATA_DIR)) {
		console.error(`Missing data dir: ${DATA_DIR}`);
		process.exit(1);
	}

	ensureDir(PUBLIC_DIR);

	// Always rebuild public/data to keep it in sync with repo data/
	rmDirIfExists(PUBLIC_DATA_DIR);
	copyDir(DATA_DIR, PUBLIC_DATA_DIR);

	// Generate manifest from repo data/ (source of truth)
	const files = walk(DATA_DIR).filter(isCsv);

	const entries = files.map((absPath) => {
		// Example rel: "Accolite/1. Thirty Days.csv"
		const relFromData = path.relative(DATA_DIR, absPath);
		const parts = relFromData.split(path.sep);

		const company = parts[0] ?? "Unknown";
		const filename = parts[parts.length - 1] ?? "Unknown.csv";
		const label = filename.replace(/\.csv$/i, "");

		// Deterministic, stable id
		const csv_id = `${slugify(company)}-${slugify(label)}`;

		return {
			csv_id,
			company,
			label,
			// Keep a readable repo-relative path for debugging
			path: `data/${relFromData.split(path.sep).join("/")}`,
			// URL that will exist in dist after Vite copies public/
			url: toRelativeUrlFromData(relFromData),
			rows: countRows(absPath),
		};
	});

	// Stable ordering keeps diffs clean and makes debugging easier
	entries.sort((a, b) => {
		const c = a.company.localeCompare(b.company);
		if (c !== 0) return c;
		return a.label.localeCompare(b.label);
	});

	fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2), "utf8");

	console.log(
		`Wrote manifest: ${path.relative(REPO_ROOT, MANIFEST_PATH)} (${entries.length} csvs)`,
	);
	console.log(`Copied data -> ${path.relative(REPO_ROOT, PUBLIC_DATA_DIR)}`);
}

main();
