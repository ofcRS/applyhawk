/**
 * Generate PNG icons from SVG
 * Uses sharp for high-quality SVG to PNG conversion
 * Run: node icons/generate-icons.js
 */

const fs = require("fs");
const path = require("path");

async function generateIcons() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("sharp not installed. Installing...");
    const { execSync } = require("child_process");
    execSync("bun add sharp", { stdio: "inherit" });
    sharp = require("sharp");
  }

  const svgPath = path.join(__dirname, "icon.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const outputPath = path.join(__dirname, `icon${size}.png`);

    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);

    console.log(`Created icon${size}.png (${size}x${size})`);
  }

  console.log("\nIcons generated successfully!");
}

generateIcons().catch(console.error);
