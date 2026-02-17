// file: src/app/App.tsx

import {BrowserRouter} from "react-router-dom";
import {AppRoutes} from "./routes";

export default function App() {
    // GitHub Pages repo path requires basename. Vite BASE_URL includes trailing slash.
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AppRoutes/>
        </BrowserRouter>
    );
}
