// file: src/components/layout/Footer.tsx

import {useTheme} from "../../theme/useTheme";

type FooterLink = {
    readonly label: string;
    readonly href: string;
};

const LINKS: readonly FooterLink[] = [
    {label: "GitHub", href: "https://github.com/NefariousNiru"},
    {label: "LinkedIn", href: "https://linkedin.com/in/nbroy"},
];

const CREDITS_HREF =
    "https://github.com/liquidslr/interview-company-wise-problems/tree/main";

function externalAnchor(label: string, href: string) {
    return (
        <a href={href} target="_blank" rel="noreferrer">
            {label}
        </a>
    );
}

export function Footer() {
    const healthHref = `${import.meta.env.BASE_URL}health`;
    const {preference, setPreference} = useTheme();

    return (
        <footer className="footer">
            <div className="footer-grid">
                <div className="footer-links">
                    {LINKS.map((l) => (
                        <span key={l.href}>{externalAnchor(l.label, l.href)}</span>
                    ))}
                    <span>
                        <a href={healthHref}>Health</a>
                    </span>
                </div>

                <div className="footer-right">
                    <div className="row" style={{justifyContent: "flex-end"}}>
                        <span className="muted" style={{fontSize: 13}}>
                          Theme
                        </span>
                        <span className="select-wrap">
                            <select
                                value={preference}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "light" || v === "dark" || v === "system") setPreference(v);
                                }}
                            >
                                <option value="system">System</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </span>
                    </div>

                    <div className="muted" style={{fontSize: 13}}>
                        Problem list based off CSVs from:{" "}
                        {externalAnchor("liquidslr/interview-company-wise-problems", CREDITS_HREF)}
                    </div>
                </div>
            </div>
        </footer>
    );
}
