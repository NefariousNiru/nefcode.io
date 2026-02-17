// file: src/pages/LandingPage.tsx

import {Footer} from "../components/layout/Footer";

export function LandingPage() {
    return (
        <div className="container">
            <div className="stack" style={{gap: 18}}>
                <header className="stack" style={{gap: 10, marginTop: 6}}>
                    <h1 className="h1">NefCode.io</h1>
                    <p className="p muted">
                        Offline-first company-wise LeetCode tracker.
                        <br/>
                        Progress is global per problem link and stored locally in your browser.
                    </p>
                </header>

                <section className="card sheen">
                    <div className="card-inner">
                        <div className="stack" style={{gap: 10}}>
                            <h2 className="h2">What this will do</h2>
                            <ul style={{margin: 0, paddingLeft: 18, lineHeight: 1.7}}>
                                <li>Load curated company-wise lists from hosted CSVs</li>
                                <li>Track completion once per problem (shared across all companies)</li>
                                <li>Track time spent, notes, and updated timestamps per problem</li>
                                <li>Compute stats: difficulty, topics, time, frequency-weighted progress</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <Footer/>
            </div>
        </div>
    );
}
