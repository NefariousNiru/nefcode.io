// file: main.tsx

import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './app/App.tsx'
import {ThemeProvider} from "./theme/ThemeProvider.tsx";
import "./index.css";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider>
            <App/>
        </ThemeProvider>
    </StrictMode>,
)
