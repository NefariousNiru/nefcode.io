// file: tracker/scripts/build.mjs

import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(process.cwd());
const src = path.join(root, "src");
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
	absWorkingDir: root,
	entryPoints: [
		path.join(src, "background.ts"),
		path.join(src, "content_leetcode.ts"),
		path.join(src, "content_nefcode_bridge.ts"),
		path.join(src, "save", "save.ts"),
	],
	outdir: dist,
	bundle: true,
	format: "esm",
	target: "es2022",
	sourcemap: true,
	minify: false,
	define: {
		"process.env.NODE_ENV": '"production"',
	},
});

await mkdir(path.join(dist, "save"), { recursive: true });
await cp(
	path.join(src, "save", "save.html"),
	path.join(dist, "save", "save.html"),
);
await cp(
	path.join(src, "save", "save.css"),
	path.join(dist, "save", "save.css"),
);

console.log("tracker build complete:", dist);
