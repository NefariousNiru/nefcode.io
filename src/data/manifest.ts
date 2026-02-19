// file: src/data/manifest.ts

import type { Manifest, ManifestCompany, ManifestFile } from "../domain/types";

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
	return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
	return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function normalizeFileNameFromUrl(url: string): string {
	const parts = url.split("/");
	const last = parts[parts.length - 1] ?? url;
	const decoded = decodeURIComponent(last);
	return decoded.toLowerCase().endsWith(".csv")
		? decoded.slice(0, -4)
		: decoded;
}

function validateRelativeUrl(url: string): string | null {
	const u = url.trim();
	if (!u) return null;
	if (u.startsWith("/")) return null; // must be relative for GitHub Pages base path
	return u;
}

function parseCompaniesShape(obj: UnknownRecord): ManifestCompany[] | null {
	const companiesVal = obj.companies;
	if (!Array.isArray(companiesVal)) return null;

	const companies: ManifestCompany[] = [];

	for (const c of companiesVal) {
		if (!isRecord(c)) continue;
		const name = asString(c.name);
		const filesVal = c.files;
		if (!name || !Array.isArray(filesVal)) continue;

		const files: ManifestFile[] = [];
		for (const f of filesVal) {
			if (!isRecord(f)) continue;
			const urlRaw = asString(f.url);
			const url = urlRaw ? validateRelativeUrl(urlRaw) : null;
			if (!url) continue;

			const nameRaw = asString(f.name) ?? asString(f.label);
			files.push({
				name: nameRaw?.trim() || normalizeFileNameFromUrl(url),
				url,
			});
		}

		if (files.length > 0) {
			companies.push({ name: name.trim(), files });
		}
	}

	return companies.length > 0 ? companies : null;
}

function buildCompaniesFromEntries(
	entries: unknown[],
): ManifestCompany[] | null {
	const byCompany = new Map<string, ManifestFile[]>();

	for (const e of entries) {
		if (!isRecord(e)) continue;

		const company = asString(e.company) ?? asString(e.Company);
		const urlRaw = asString(e.url) ?? asString(e.Url);
		const rowsMeta = asNumber(e.rows);

		if (!company || !urlRaw) continue;

		const url = validateRelativeUrl(urlRaw);
		if (!url) continue;

		const nameRaw =
			asString(e.label) ??
			asString(e.name) ??
			asString(e.file) ??
			asString(e.File);

		const file: ManifestFile = {
			name: nameRaw?.trim() || normalizeFileNameFromUrl(url),
			url,
			rows: rowsMeta ?? undefined,
		};

		const key = company.trim();
		const arr = byCompany.get(key);
		if (arr) arr.push(file);
		else byCompany.set(key, [file]);
	}

	if (byCompany.size === 0) return null;

	return Array.from(byCompany.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, files]) => ({
			name,
			files: files.sort((x, y) => x.name.localeCompare(y.name)),
		}));
}

function parseEntriesShape(obj: UnknownRecord): ManifestCompany[] | null {
	const entries = obj.entries ?? obj.files ?? obj.items;

	if (!Array.isArray(entries)) return null;
	return buildCompaniesFromEntries(entries);
}

function parseTopLevelArrayShape(payload: unknown): ManifestCompany[] | null {
	if (!Array.isArray(payload)) return null;
	return buildCompaniesFromEntries(payload);
}

/**
 * Fetch manifest.json from GitHub Pages using Vite BASE_URL.
 * Assumption: manifest.json is deployed at `${BASE_URL}manifest.json`.
 */
export async function fetchManifest(signal?: AbortSignal): Promise<Manifest> {
	const base = import.meta.env.BASE_URL;
	const res = await fetch(`${base}manifest.json`, { signal });

	if (!res.ok) {
		throw new Error(
			`Failed to fetch manifest.json: ${res.status} ${res.statusText}`,
		);
	}

	const payload: unknown = await res.json();

	let generatedAt = "";
	let companies: ManifestCompany[] | null = null;

	if (Array.isArray(payload)) {
		companies = parseTopLevelArrayShape(payload);
	} else if (isRecord(payload)) {
		generatedAt =
			asString(payload.generatedAt) ?? asString(payload.generated_at) ?? "";
		companies = parseCompaniesShape(payload) ?? parseEntriesShape(payload);
	}

	if (!companies) {
		throw new Error(
			"Unrecognized manifest.json shape. Expected top-level array or companies[]/entries[].",
		);
	}

	return { generatedAt, companies };
}
