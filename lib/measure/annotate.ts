import sharp from "sharp";

// Shared drawing/encoding helpers for wall-ratios.ts and floor-ratio.ts —
// both return an annotated copy of the input photo alongside their ratios,
// so it's visible which lengths produced which number. OpenCV's built-in
// text rendering (Hershey vector fonts) has no CJK glyphs, so labels drawn
// on the image itself are short ASCII tags; the actual Japanese legend
// lives in the UI, keyed to the same colors.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cv = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mat = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CvPoint = any;

export const COLORS = {
  roomWidth: [34, 197, 94, 255], // green
  roomHeight: [59, 130, 246, 255], // blue
  toiletWidth: [239, 68, 68, 255], // red
  floorBox: [245, 158, 11, 255], // amber
  toiletArea: [236, 72, 153, 255], // pink
  wallArea: [168, 85, 247, 255], // purple
} as const;

/**
 * A measurement line with small perpendicular tick marks at each end, like a
 * dimension line in a technical drawing. `labelOffset` nudges just the text
 * (not the line itself) away from its default midpoint position — needed
 * when two dimension lines are deliberately collinear (e.g. toilet width is
 * a sub-segment of room width at the same height) and would otherwise stack
 * illegibly on top of each other.
 */
export function drawDimensionLine(
  cv: Cv,
  img: Mat,
  p1: CvPoint,
  p2: CvPoint,
  color: readonly number[],
  label: string,
  labelOffset?: { x: number; y: number },
) {
  const scalar = new cv.Scalar(...color);
  const thickness = Math.max(3, Math.round(img.cols * 0.003));
  const tick = Math.max(12, Math.round(img.cols * 0.015));
  cv.line(img, p1, p2, scalar, thickness);

  const vertical = p1.x === p2.x;
  for (const p of [p1, p2]) {
    const a = vertical ? new cv.Point(p.x - tick, p.y) : new cv.Point(p.x, p.y - tick);
    const b = vertical ? new cv.Point(p.x + tick, p.y) : new cv.Point(p.x, p.y + tick);
    cv.line(img, a, b, scalar, thickness);
  }

  const mid = new cv.Point(
    Math.round((p1.x + p2.x) / 2) + (labelOffset?.x ?? 0),
    Math.round((p1.y + p2.y) / 2) + (labelOffset?.y ?? 0),
  );
  drawLabel(cv, img, label, mid, color);
}

export function drawBox(
  cv: Cv,
  img: Mat,
  rect: { x: number; y: number; width: number; height: number },
  color: readonly number[],
  label: string,
) {
  const scalar = new cv.Scalar(...color);
  const thickness = Math.max(3, Math.round(img.cols * 0.003));
  cv.rectangle(
    img,
    new cv.Point(rect.x, rect.y),
    new cv.Point(rect.x + rect.width, rect.y + rect.height),
    scalar,
    thickness,
  );
  drawLabel(cv, img, label, new cv.Point(rect.x, Math.max(0, rect.y - 10)), color);
}

function drawLabel(cv: Cv, img: Mat, text: string, at: CvPoint, color: readonly number[]) {
  const fontScale = Math.max(0.6, img.cols / 1400);
  const thickness = Math.max(2, Math.round(img.cols * 0.0025));
  // Dark outline pass first so the label stays legible over any
  // background color, then the real (colored) text on top.
  cv.putText(
    img,
    text,
    at,
    cv.FONT_HERSHEY_SIMPLEX,
    fontScale,
    new cv.Scalar(0, 0, 0, 255),
    thickness + 3,
  );
  cv.putText(img, text, at, cv.FONT_HERSHEY_SIMPLEX, fontScale, new cv.Scalar(...color), thickness);
}

/**
 * Encodes an RGBA cv.Mat to a JPEG data URL, downscaled to a max width —
 * this is a confirmation visual, not a working copy, and it ends up in
 * sessionStorage (two of them, alongside the original full-res photos
 * already having been uploaded), so it needs to stay well under browser
 * storage quotas. Caller keeps ownership of `mat` (not deleted here).
 */
export async function encodeMatToDataUrl(mat: Mat): Promise<string> {
  const buffer = Buffer.from(mat.data);
  const jpeg = await sharp(buffer, {
    raw: { width: mat.cols, height: mat.rows, channels: mat.channels() },
  })
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 65 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}
