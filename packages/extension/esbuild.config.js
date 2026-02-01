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

// Create new folder structure in dist
mkdirSync(join(outDir, "core", "utils"), { recursive: true });
mkdirSync(join(outDir, "platforms", "hh", "content"), { recursive: true });
mkdirSync(join(outDir, "platforms", "hh", "styles"), { recursive: true });
mkdirSync(join(outDir, "platforms", "universal"), { recursive: true });
mkdirSync(join(outDir, "ui", "panel"), { recursive: true });
mkdirSync(join(outDir, "ui", "options"), { recursive: true });
mkdirSync(join(outDir, "ui", "shared"), { recursive: true });

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
  entryPoints: ["src/background.js"],
  outfile: join(outDir, "background.js"),
});

// Build content script (vacancy page)
const contentBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/platforms/hh/content/vacancy-ui.js"],
  outfile: join(outDir, "platforms", "hh", "content", "vacancy-ui.js"),
});

// Build injector content script (all HH.ru pages)
const injectorBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/platforms/hh/content/injector.js"],
  outfile: join(outDir, "platforms", "hh", "content", "injector.js"),
});

// Build options page (needs bundling for pdfjs-dist)
const optionsBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/ui/options/options.js"],
  outfile: join(outDir, "ui", "options", "options.js"),
});

// Build universal job detector content script
const universalBuild = esbuild.build({
  ...commonOptions,
  entryPoints: ["src/platforms/universal/content-script.js"],
  outfile: join(outDir, "platforms", "universal", "content-script.js"),
});

await Promise.all([
  backgroundBuild,
  contentBuild,
  injectorBuild,
  optionsBuild,
  universalBuild,
]);

// Copy static files
copyFileSync("manifest.json", join(outDir, "manifest.json"));

// Copy oauth callback page
if (existsSync("src/oauth-callback.html")) {
  copyFileSync("src/oauth-callback.html", join(outDir, "oauth-callback.html"));
}

// Copy shared UI folder (design system)
if (existsSync("src/ui/shared")) {
  cpSync("src/ui/shared", join(outDir, "ui", "shared"), { recursive: true });
}

// Copy panel folder (side panel)
if (existsSync("src/ui/panel")) {
  cpSync("src/ui/panel", join(outDir, "ui", "panel"), { recursive: true });
}

// Copy options folder (only HTML and CSS, JS is bundled)
if (existsSync("src/ui/options/options.html")) {
  copyFileSync(
    "src/ui/options/options.html",
    join(outDir, "ui", "options", "options.html"),
  );
}
if (existsSync("src/ui/options/options.css")) {
  copyFileSync(
    "src/ui/options/options.css",
    join(outDir, "ui", "options", "options.css"),
  );
}

// Copy content script CSS
if (existsSync("src/platforms/hh/styles/vacancy.css")) {
  copyFileSync(
    "src/platforms/hh/styles/vacancy.css",
    join(outDir, "platforms", "hh", "styles", "vacancy.css"),
  );
}

// Copy network interceptor (not bundled, injected into page context)
if (existsSync("src/core/utils/network-interceptor.js")) {
  copyFileSync(
    "src/core/utils/network-interceptor.js",
    join(outDir, "core", "utils", "network-interceptor.js"),
  );
}

// Copy icons folder
if (existsSync("icons")) {
  cpSync("icons", join(outDir, "icons"), { recursive: true });
}

// Copy fonts folder
if (existsSync("fonts")) {
  cpSync("fonts", join(outDir, "fonts"), { recursive: true });
} else if (existsSync("src/fonts")) {
  cpSync("src/fonts", join(outDir, "fonts"), { recursive: true });
}

// Copy prompts folder (YAML templates)
if (existsSync("src/prompts")) {
  cpSync("src/prompts", join(outDir, "prompts"), { recursive: true });
}

console.log("Extension build completed successfully!");

if (isWatch) {
  console.log("Watching for changes...");

  const ctx = await esbuild.context({
    ...commonOptions,
    entryPoints: [
      "src/background.js",
      "src/platforms/hh/content/vacancy-ui.js",
    ],
    outdir: outDir,
  });

  await ctx.watch();
}
