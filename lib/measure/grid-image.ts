import sharp from "sharp";

// ---------------------------------------------------------------------------
// Builds the image actually sent to the vision model: resized (the model's
// own encoder has a resolution ceiling regardless, and this keeps token
// cost/latency down) and overlaid with a reference percentage grid (red
// lines every 10%, yellow axis labels). Asking a vision-language model for
// raw pixel coordinates blind is unreliable; giving it visible gridlines to
// anchor against measurably improves spatial grounding — confirmed in
// testing against real photos (see wall-detection.ts / floor-detection.ts).
//
// Critically: `.rotate()` applies the photo's own EXIF orientation before
// anything else. Phone photos routinely carry EXIF orientation 6/8 (rotate
// 90°) while storing pixels in the un-rotated, landscape layout — confirmed
// on every real photo in Photo02/. Skipping this step means every CV/AI
// pass before this fix was silently analyzing sideways images, which is a
// far more fundamental explanation for "nothing detects correctly" than any
// model or algorithm choice. origWidth/origHeight below are the *rotated*
// (correct, as-displayed) dimensions, and all percentage coordinates the
// model returns are relative to that same corrected frame.
// ---------------------------------------------------------------------------

const TARGET_MAX_DIMENSION = 1536;
const GRID_STEP_PERCENT = 10;

export type GriddedImage = {
  dataUrl: string;
  /** Original (EXIF-corrected) image dimensions — percentage coordinates the model returns map onto this frame. */
  originalWidth: number;
  originalHeight: number;
};

export async function buildGriddedImage(imageBuffer: Buffer): Promise<GriddedImage> {
  const rotated = await sharp(imageBuffer)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const originalWidth = rotated.info.width;
  const originalHeight = rotated.info.height;

  const scale = Math.min(1, TARGET_MAX_DIMENSION / Math.max(originalWidth, originalHeight));
  const width = Math.round(originalWidth * scale);
  const height = Math.round(originalHeight * scale);

  let svg = "";
  for (let p = 0; p <= 100; p += GRID_STEP_PERCENT) {
    const x = Math.round((p / 100) * width);
    const y = Math.round((p / 100) * height);
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,0,0,0.6)" stroke-width="2"/>`;
    svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,0,0,0.6)" stroke-width="2"/>`;
    svg += `<text x="${Math.min(x + 3, width - 25)}" y="16" font-size="16" fill="yellow" stroke="black" stroke-width="0.5">${p}</text>`;
    svg += `<text x="2" y="${Math.min(y + 16, height - 2)}" font-size="16" fill="yellow" stroke="black" stroke-width="0.5">${p}</text>`;
  }
  const svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;

  const jpeg = await sharp(rotated.data, {
    raw: { width: originalWidth, height: originalHeight, channels: 4 },
  })
    .resize({ width, height })
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
    originalWidth,
    originalHeight,
  };
}
