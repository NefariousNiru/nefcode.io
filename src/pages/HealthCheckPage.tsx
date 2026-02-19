// file: src/pages/HealthCheckPage.tsx

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchCsvText, parseAndNormalizeCsv } from "../data/csv";
import { fetchManifest } from "../data/manifest";
import { useTheme } from "../theme/useTheme";
import { pickRandomFile } from "../utils/functions.ts";

type HealthState =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| {
			readonly kind: "ready";
			readonly baseUrl: string;
			readonly localStorageOk: boolean;
			readonly companyCount: number;
			readonly sampleCompany: string;
			readonly sampleFileName: string;
			readonly sampleFileUrl: string;
			readonly sampleRows: number;
			readonly sampleIssues: number;
	  };

function Row({
	label,
	value,
	ok,
	hint,
}: {
	readonly label: string;
	readonly value: string;
	readonly ok: boolean;
	readonly hint?: string;
}) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-2xl border border-[rgb(var(--border))] p-4">
			<div className="min-w-0">
				<div className="font-medium">{label}</div>
				<div className="muted mt-1 text-sm break-words">{value}</div>
				{hint ? (
					<div className="muted mt-2 flex items-start gap-2 text-xs leading-5">
						<Info className="mt-[2px] h-3.5 w-3.5" />
						<span>{hint}</span>
					</div>
				) : null}
			</div>
			<div className="pt-1">
				{ok ? (
					<CheckCircle2 className="h-5 w-5 text-[rgba(34,197,94,0.95)]" />
				) : (
					<XCircle className="h-5 w-5 text-[rgba(239,68,68,0.95)]" />
				)}
			</div>
		</div>
	);
}

export function HealthCheckPage() {
	const { preference, mode } = useTheme();
	const baseUrl = import.meta.env.BASE_URL ?? "/";

	const localStorageOk = useMemo(() => {
		try {
			localStorage.setItem("__nefcode_test__", "1");
			localStorage.removeItem("__nefcode_test__");
			return true;
		} catch {
			return false;
		}
	}, []);

	const [state, setState] = useState<HealthState>({ kind: "loading" });

	useEffect(() => {
		const ac = new AbortController();
		setState({ kind: "loading" });

		fetchManifest(ac.signal)
			.then(async (m) => {
				const picked = pickRandomFile(m.companies);
				if (!picked)
					throw new Error("Manifest loaded but contains no CSV entries.");

				const csvText = await fetchCsvText(picked.file.url, ac.signal);
				const parsed = parseAndNormalizeCsv(csvText);

				setState({
					kind: "ready",
					baseUrl,
					localStorageOk,
					companyCount: m.companies.length,
					sampleCompany: picked.company,
					sampleFileName: picked.file.name,
					sampleFileUrl: picked.file.url,
					sampleRows: parsed.items.length,
					sampleIssues: parsed.issuesCount,
				});
			})
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, [localStorageOk]);

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">
						Health check
					</h1>
					<p className="muted mt-1">Manifest + random CSV parse check.</p>
				</div>

				<div className="glass p-6">
					<div className="grid gap-4">
						<Row
							label="Theme preference"
							value={preference}
							ok={
								preference === "light" ||
								preference === "dark" ||
								preference === "system"
							}
						/>
						<Row
							label="Resolved mode"
							value={mode}
							ok={mode === "light" || mode === "dark"}
						/>
						<Row
							label="localStorage"
							value={localStorageOk ? "available" : "blocked"}
							ok={localStorageOk}
						/>
						<Row
							label="Vite BASE_URL"
							value={baseUrl}
							ok={baseUrl.length > 0}
						/>

						{state.kind === "loading" ? (
							<Row label="Manifest + CSV" value="Running..." ok={true} />
						) : null}

						{state.kind === "error" ? (
							<Row label="Manifest + CSV" value={state.message} ok={false} />
						) : null}

						{state.kind === "ready" ? (
							<>
								<Row
									label="manifest.json"
									value={`${state.baseUrl}manifest.json (${state.companyCount} companies)`}
									ok={state.companyCount > 0}
								/>
								<Row
									label="Random CSV"
									value={`${state.sampleCompany} - ${state.sampleFileName} | ${state.sampleRows} rows | ${state.sampleIssues} issues`}
									ok={state.sampleRows > 0}
									hint={`${state.baseUrl}${state.sampleFileUrl}`}
								/>
							</>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
