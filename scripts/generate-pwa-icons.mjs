import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");

const sizes = [
  { name: "icon-32.png", size: 32, source: "lion-mark.svg" },
  { name: "icon-192.png", size: 192, source: "lion-mark.svg" },
  { name: "icon-512.png", size: 512, source: "lion-mark.svg" },
  { name: "apple-touch-icon.png", size: 180, source: "lion-mark.svg" },
  { name: "icon-maskable-512.png", size: 512, source: "lion-maskable.svg" },
];

async function generateIcon({ name, size, source }) {
  const svg = await readFile(path.join(iconsDir, source));
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(path.join(iconsDir, name), png);
  console.log(`Generated ${name} (${size}x${size})`);
}

await mkdir(iconsDir, { recursive: true });
await Promise.all(sizes.map(generateIcon));

const favicon = await readFile(path.join(iconsDir, "icon-32.png"));
await writeFile(path.join(root, "public", "favicon.ico"), favicon);
console.log("Generated favicon.ico");
