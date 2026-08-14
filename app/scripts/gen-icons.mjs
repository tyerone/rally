// One-off PWA icon generator: rasterizes the Rally logo mark on a navy
// square background at the sizes the manifest needs. Run with `node
// scripts/gen-icons.mjs` after `npm i -D sharp` (sharp is not a runtime dep).
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const LOGO_PATH =
  "M13.0641 1.53472L0.132383 37.2262C-0.383078 38.6488 0.670731 40.1515 2.18391 40.1515C3.10905 40.1515 3.93363 39.5681 4.24154 38.6957L6.67106 31.812C6.99951 30.8814 7.87912 30.2591 8.86599 30.2591H23.2333C24.8103 30.2591 25.9308 31.7942 25.4502 33.2961L25.0663 34.4959C24.5857 35.9978 25.7062 37.5329 27.2832 37.5329H37.5726C38.5617 37.5329 39.4428 36.9078 39.7695 35.9742L42.2135 28.9914C42.7432 27.478 41.6199 25.8948 40.0166 25.8948H31.2659C29.6324 25.8948 28.507 24.2562 29.0934 22.7316L30.7863 18.33H44.6388C45.5867 18.33 46.4398 17.7553 46.7959 16.8769L49.273 10.7669C49.8934 9.23654 48.7672 7.56477 47.1159 7.56477H38.4195C36.8195 7.56477 35.6965 5.98774 36.2199 4.47576L36.6999 3.08901C37.2233 1.57703 36.1004 0 34.5004 0H15.2525C14.2727 0 13.3978 0.613547 13.0641 1.53472ZM30.7863 18.33H15.5241C13.899 18.33 12.7741 16.7068 13.3447 15.1851L14.2176 12.8575C14.5582 11.949 15.4267 11.3472 16.397 11.3472H29.8846C31.4733 11.3472 32.5951 12.9036 32.0927 14.4108L30.7863 18.33Z";

function svg(size, { scale, bg }) {
  const logoW = 50 * scale;
  const logoH = 41 * scale;
  const x = (size - logoW) / 2;
  const y = (size - logoH) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <g transform="translate(${x} ${y}) scale(${scale})">
      <path fill-rule="evenodd" clip-rule="evenodd" d="${LOGO_PATH}" fill="#4FCBBB"/>
    </g>
  </svg>`;
}

const jobs = [
  { name: "icon-192.png", size: 192, scale: 3.0, bg: "#15161B" },
  { name: "icon-512.png", size: 512, scale: 8.0, bg: "#15161B" },
  { name: "maskable-512.png", size: 512, scale: 5.2, bg: "#15161B" }, // extra padding for the maskable safe zone
];

for (const job of jobs) {
  const buf = Buffer.from(svg(job.size, job));
  await sharp(buf).png().toFile(path.join(outDir, job.name));
  console.log("wrote", job.name);
}
