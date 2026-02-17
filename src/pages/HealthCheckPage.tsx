// file: src/pages/HealthCheckPage.tsx

import {useEffect, useMemo, useState} from "react";
import type {Manifest} from "../domain/types";
import {fetchManifest} from "../data/manifest";
import {loadCsv} from "../data/csv";

type SamplePick = {
    readonly company: string;
    readonly fileName: string;
    readonly url: string;
    readonly rowsMeta?: number;
};

type HealthDetails = {
    readonly baseUrl: string;
    readonly companies: number;
    readonly files: number;
    readonly sample: SamplePick;
    readonly parsedRows: number;
    readonly issuesCount: number;
    readonly csvTextLikelyEmpty: boolean;
};

type LoadState =
    | { readonly kind: "idle" }
    | { readonly kind: "loading" }
    | { readonly kind: "error"; readonly message: string }
    | { readonly kind: "ready"; readonly details: HealthDetails };

function flattenFiles(manifest: Manifest): readonly SamplePick[] {
    const out: SamplePick[] = [];
    for (const c of manifest.companies) {
        for (const f of c.files) {
            out.push({
                company: c.name,
                fileName: f.name,
                url: f.url,
                rowsMeta: f.rows,
            });
        }
    }
    return out;
}

function pickRandomSample(files: readonly SamplePick[]): SamplePick | null {
    if (files.length === 0) return null;

    const nonEmptyByMeta = files.filter((f) => (f.rowsMeta ?? 1) > 0);
    const pool = nonEmptyByMeta.length > 0 ? nonEmptyByMeta : files;

    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] ?? null;
}

function Badge({ok, label}: { ok: boolean; label: string }) {
    const cls = ok ? "badge badge-ok" : "badge badge-fail";
    return (
        <span className={cls}>
      <span className="badge-dot"/>
            {label}
    </span>
    );
}

export function HealthCheckPage() {
    const [state, setState] = useState<LoadState>({kind: "idle"});

    useEffect(() => {
        const ac = new AbortController();

        const run = async () => {
            setState({kind: "loading"});
            try {
                const baseUrl = import.meta.env.BASE_URL;
                const manifest = await fetchManifest(ac.signal);

                const companies = manifest.companies.length;
                const filesTotal = manifest.companies.reduce((acc, c) => acc + c.files.length, 0);

                const allFiles = flattenFiles(manifest);
                const sample = pickRandomSample(allFiles);
                if (!sample) {
                    setState({kind: "error", message: "Manifest contains zero CSV files."});
                    return;
                }

                const csv = await loadCsv(sample.url, ac.signal);
                const csvTextLikelyEmpty = csv.items.length === 0 && (sample.rowsMeta ?? 1) === 0;

                setState({
                    kind: "ready",
                    details: {
                        baseUrl,
                        companies,
                        files: filesTotal,
                        sample,
                        parsedRows: csv.items.length,
                        issuesCount: csv.issuesCount,
                        csvTextLikelyEmpty,
                    },
                });
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Unknown error";
                setState({kind: "error", message: msg});
            }
        };

        void run();
        return () => ac.abort();
    }, []);

    const header = useMemo(() => {
        return {
            title: "Health check",
            subtitle: "Manifest + CSV fetch/parse sanity checks (GitHub Pages compatible)",
        };
    }, []);

    if (state.kind === "loading" || state.kind === "idle") {
        return (
            <div className="container">
                <div className="stack" style={{gap: 10}}>
                    <h1 className="h1">{header.title}</h1>
                    <p className="p muted">{header.subtitle}</p>

                    <section className="card sheen">
                        <div className="card-inner">
                            <div className="row">
                                <Badge ok={true} label="Running"/>
                                <span className="muted">Loading manifest and sampling a CSV...</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    if (state.kind === "error") {
        return (
            <div className="container">
                <div className="stack" style={{gap: 10}}>
                    <h1 className="h1">{header.title}</h1>
                    <p className="p muted">{header.subtitle}</p>

                    <section className="card sheen">
                        <div className="card-inner">
                            <div className="stack" style={{gap: 10}}>
                                <div className="row">
                                    <Badge ok={false} label="Failed"/>
                                </div>
                                <p className="p" style={{whiteSpace: "pre-wrap"}}>
                                    {state.message}
                                </p>
                                <p className="p muted">
                                    BASE_URL: <code>{import.meta.env.BASE_URL}</code>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    const d = state.details;
    const okManifest = d.companies > 0 && d.files > 0;
    const okCsv = d.parsedRows > 0 || d.csvTextLikelyEmpty;
    const okOverall = okManifest && okCsv;

    return (
        <div className="container">
            <div className="stack" style={{gap: 10}}>
                <h1 className="h1">{header.title}</h1>
                <p className="p muted">{header.subtitle}</p>

                <section className="card sheen">
                    <div className="card-inner">
                        <div className="stack" style={{gap: 10}}>
                            <div className="row">
                                <Badge ok={okOverall} label={okOverall ? "Healthy" : "Degraded"}/>
                                <span className="muted">
                  BASE_URL: <code>{d.baseUrl}</code>
                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid-2">
                    <section className="card sheen">
                        <div className="card-inner">
                            <div className="stack" style={{gap: 10}}>
                                <div className="row" style={{justifyContent: "space-between"}}>
                                    <h2 className="h2">Manifest</h2>
                                    <Badge ok={okManifest} label={okManifest ? "OK" : "FAIL"}/>
                                </div>
                                <ul style={{margin: 0, paddingLeft: 18, lineHeight: 1.7}}>
                                    <li>Companies: {d.companies}</li>
                                    <li>Files: {d.files}</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="card sheen">
                        <div className="card-inner">
                            <div className="stack" style={{gap: 10}}>
                                <div className="row" style={{justifyContent: "space-between"}}>
                                    <h2 className="h2">CSV sample</h2>
                                    <Badge ok={okCsv} label={okCsv ? "OK" : "FAIL"}/>
                                </div>

                                <ul style={{margin: 0, paddingLeft: 18, lineHeight: 1.7}}>
                                    <li>
                                        Sample: {d.sample.company} / {d.sample.fileName}
                                    </li>
                                    <li>
                                        Sample URL: <code>{d.sample.url}</code>
                                    </li>
                                    <li>Manifest rows
                                        metadata: {typeof d.sample.rowsMeta === "number" ? d.sample.rowsMeta : "n/a"}</li>
                                    <li>Parsed rows: {d.parsedRows}</li>
                                    <li>Parse/normalize issues: {d.issuesCount}</li>
                                </ul>

                                {d.parsedRows === 0 ? (
                                    <p className="p muted" style={{marginTop: 6}}>
                                        Parsed rows are 0. Likely causes: empty CSV, header mismatch, or rows dropped
                                        due to missing
                                        Link/Title/Difficulty.
                                    </p>
                                ) : null}

                                <p className="p muted" style={{marginTop: 6}}>
                                    Refresh to sample a different CSV.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
