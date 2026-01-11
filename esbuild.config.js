import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import * as esbuild from "esbuild";

const isWatch = process.env.WATCH === "true";
const outDir = "dist";

// Clean dist folder
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true });
}
mkdirSync(outDir);
mkdirSync(join(outDir, "content-scripts"), { recursive: true });

// Common build options
const commonOptions = {
  bundle: true,
  format: "esm",
  platform: "browser",
  sourcemap: true,
  minify: false,
};

// Build background script
const backgroundBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/background-scripts/background.js"],
  outfile: join(outDir, "background.js"),
});

// Build content script (vacancy page)
const contentBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/content-scripts/hh-vacancy.js"],
  outfile: join(outDir, "content-scripts", "hh-vacancy.js"),
});

// Build injector content script (all HH.ru pages)
const injectorBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/content-scripts/hh-injector.js"],
  outfile: join(outDir, "content-scripts", "hh-injector.js"),
});

// Build options page (needs bundling for pdfjs-dist)
mkdirSync(join(outDir, "options"), { recursive: true });
const optionsBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/options/options.js"],
  outfile: join(outDir, "options", "options.js"),
});

await Promise.all([backgroundBuild, contentBuild, injectorBuild, optionsBuild]);

// Copy static files
copyFileSync("manifest.json", join(outDir, "manifest.json"));

// Copy oauth callback page
if (existsSync("src/oauth-callback.html")) {
  copyFileSync("src/oauth-callback.html", join(outDir, "oauth-callback.html"));
}

// Copy panel folder (side panel)
if (existsSync("src/panel")) {
  cpSync("src/panel", join(outDir, "panel"), { recursive: true });
}

// Copy popup folder (legacy, keeping for now)
if (existsSync("src/popup")) {
  cpSync("src/popup", join(outDir, "popup"), { recursive: true });
}

// Copy options folder (only HTML and CSS, JS is bundled)
if (existsSync("src/options/options.html")) {
  copyFileSync(
    "src/options/options.html",
    join(outDir, "options", "options.html"),
  );
}
if (existsSync("src/options/options.css")) {
  copyFileSync(
    "src/options/options.css",
    join(outDir, "options", "options.css"),
  );
}

// Copy PDF.js worker for options page PDF import
const pdfWorkerSrc = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
if (existsSync(pdfWorkerSrc)) {
  copyFileSync(pdfWorkerSrc, join(outDir, "options", "pdf.worker.min.mjs"));
}

// Copy content script CSS
if (existsSync("src/content-scripts/hh-vacancy.css")) {
  copyFileSync(
    "src/content-scripts/hh-vacancy.css",
    join(outDir, "content-scripts", "hh-vacancy.css"),
  );
}

// Copy network interceptor (not bundled, injected into page context)
if (existsSync("src/content-scripts/network-interceptor.js")) {
  copyFileSync(
    "src/content-scripts/network-interceptor.js",
    join(outDir, "content-scripts", "network-interceptor.js"),
  );
}

// Copy icons folder
if (existsSync("icons")) {
  cpSync("icons", join(outDir, "icons"), { recursive: true });
}

// Copy fonts folder
if (existsSync("fonts")) {
  cpSync("fonts", join(outDir, "fonts"), { recursive: true });
}

console.log("Build completed successfully!");

if (isWatch) {
  console.log("Watching for changes...");

  const ctx = await esbuild.context({
    ...commonOptions,
    entryPoints: [
      "src/background-scripts/background.js",
      "src/content-scripts/hh-vacancy.js",
    ],
    outdir: outDir,
  });

  await ctx.watch();
}
