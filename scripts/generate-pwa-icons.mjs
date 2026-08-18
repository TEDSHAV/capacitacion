import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function generateIcon(size, maskable = false) {
  const logoPath = path.join(root, "public/logo.png");
  const meta = await sharp(logoPath).metadata();

  // For maskable icons, the safe zone is the inner 80%, so we need more padding.
  // We'll fit the logo within 60% of the canvas for maskable, 75% for regular.
  const fitPercent = maskable ? 0.6 : 0.75;
  const maxLogoWidth = Math.floor(size * fitPercent);
  const maxLogoHeight = Math.floor(size * fitPercent);

  // Resize logo to fit within the max dimensions while maintaining aspect ratio
  const aspectRatio = meta.width / meta.height;
  let resizeWidth, resizeHeight;
  if (aspectRatio > maxLogoWidth / maxLogoHeight) {
    resizeWidth = maxLogoWidth;
    resizeHeight = Math.round(maxLogoWidth / aspectRatio);
  } else {
    resizeHeight = maxLogoHeight;
    resizeWidth = Math.round(maxLogoHeight * aspectRatio);
  }

  const resizedLogo = await sharp(logoPath)
    .resize(resizeWidth, resizeHeight, { fit: "contain" })
    .toBuffer();

  // Calculate position to center the logo
  const left = Math.floor((size - resizeWidth) / 2);
  const top = Math.floor((size - resizeHeight) / 2);

  // Create a white background SVG and composite the logo on top
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/></svg>`,
  );

  const outName = maskable
    ? `icon-${size}-maskable.png`
    : `icon-${size}.png`;
  const outPath = path.join(root, "public/icons", outName);

  await sharp(bg)
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toFile(outPath);

  console.log(
    `Generated: public/icons/${outName} (${size}x${size}${maskable ? ", maskable" : ""})`,
  );
}

(async () => {
  await generateIcon(192);
  await generateIcon(512);
  await generateIcon(192, true);
  await generateIcon(512, true);
  console.log("All PWA icons generated.");
})();
