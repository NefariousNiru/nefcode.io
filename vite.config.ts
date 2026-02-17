import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    return {
        plugins: [react()],
        // Dev server should use "/" so public files resolve at "/manifest.json"
        // Build should use "/nefcode.io/" for GitHub Pages repo base path
        base: command === "serve" ? "/" : "/nefcode.io/",
    };
});
