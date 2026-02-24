// file: src/app/App.tsx

import { HashRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

export default function App() {
	/**
	 * Routing strategy notes (GitHub Pages vs SPA-capable hosts)
	 *
	 * Background:
	 * - This app uses client-side routing (React Router). The "real" pages are not
	 *   separate HTML files - everything is rendered by index.html + JS.
	 *
	 * Option A: HashRouter (recommended for GitHub Pages project sites)
	 * - HashRouter stores the route in the URL hash:  /#/companies, /#/companies/:company
	 * - The browser never sends the hash fragment to the server.
	 *   GitHub Pages always serves /index.html successfully, even on refresh or deep links.
	 * - No server rewrite rules are required.
	 * - Tradeoff: URLs include "#".
	 *
	 * Option B: BrowserRouter (recommended for hosts with SPA rewrites)
	 * - BrowserRouter stores the route in the path:  /companies, /companies/:company
	 * - On refresh or direct deep link, the server must rewrite unknown paths to /index.html.
	 *   Platforms like Vercel/Netlify/Cloudflare Pages (and most custom servers) can do this.
	 * - For GitHub Pages project sites, BrowserRouter will 404 on refresh unless you add a
	 *   SPA fallback (e.g., 404.html redirect) because GH Pages does not do rewrites by default.
	 * - basename={import.meta.env.BASE_URL} is used because project sites are hosted under a
	 *   repo subpath (e.g., /<repo>/). This keeps links and route matching correct.
	 */

	// GitHub Pages (static hosting, no rewrites) - refresh/deep links must not hit the server path.
	return (
		<HashRouter>
			<AppRoutes />
		</HashRouter>
	);

	// SPA-capable hosts (rewrites to index.html) - clean URLs.
	// return (
	// 	<BrowserRouter basename={import.meta.env.BASE_URL}>
	// 		<AppRoutes />
	// 	</BrowserRouter>
	// );
}
