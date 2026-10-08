import { decodeToMat, loadOpenCv } from "./opencv-loader";
import { MatBag } from "./mat-bag";
import { COLORS, drawBox, drawDimensionLine, encodeMatToDataUrl } from "./annotate";
import { detectWallLines } from "./wall-detection";
import { toPixelPoint, toPixelRect, toPixelQuad, rectFromQuad } from "./percent-line";
import { lineLength } from "@/lib/geometry";

// ---------------------------------------------------------------------------
// From the back-wall photo (floor-to-ceiling, straight-on — see
// lib/camesuke-data.ts's "back-wall" step), derive two ratios:
//   - widthOverToilet = room width / toilet width
//   - heightOverWidth = room height / room width
//
// Detection (wall-detection.ts) returns the toilet's line/box plus the back
// wall's 4 corners, found independently (each as the intersection of two
// real seam lines) for precision — but the wall itself IS a rectangle
// (this app's capture guide asks for a straight-on shot, so real
// perspective skew should be mild), so the quad is collapsed back into a
// rectangle here via rectFromQuad rather than trusted as drawn: confirmed
// against real photos that letting the raw quad stand sometimes let the
// model invent much more skew than the room actually has, visibly
// narrowing room width from top to bottom in a way reality doesn't.
// ---------------------------------------------------------------------------

export type WallRatios = {
  widthOverToilet: number;
  heightOverWidth: number;
};

export type WallRatiosDebug = {
  imageWidth: number;
  imageHeight: number;
  confidence: number;
  notes: string | undefined;
};

export type WallRatiosResult =
  | { ok: true; ratios: WallRatios; debug: WallRatiosDebug; annotatedImage: string }
  | { ok: false; error: string };

export async function measureWallRatios(imageBuffer: Buffer): Promise<WallRatiosResult> {
  const cv = await loadOpenCv();
  const bag = new MatBag();

  try {
    const rgba = bag.track(await decodeToMat(imageBuffer));
    const width = rgba.cols;
    const height = rgba.rows;

    let detection;
    try {
      detection = await detectWallLines(imageBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `壁写真の解析に失敗しました。写真を撮り直してください。(${message})`,
      };
    }

    const toiletP1 = toPixelPoint(detection.toiletWidthLine.start, width, height);
    const toiletP2 = toPixelPoint(detection.toiletWidthLine.end, width, height);
    const toiletWidthPx = lineLength(toiletP1, toiletP2);

    const quad = toPixelQuad(detection.wallCorners, width, height);
    const wallRect = rectFromQuad(quad);
    const roomWidthPx = wallRect.right - wallRect.left;
    const roomHeightPx = wallRect.bottom - wallRect.top;

    if (toiletWidthPx <= 0 || roomWidthPx <= 0 || roomHeightPx <= 0) {
      return { ok: false, error: "検出結果が不正です。写真を撮り直してください。" };
    }

    // Dimension lines are drawn at the toilet's height (room width) and the
    // rectangle's horizontal center (room height) — the rectangle's width/
    // height is constant regardless of where exactly they're drawn, so this
    // is purely a visual placement choice, not a measurement choice.
    const toiletMidY = (toiletP1.y + toiletP2.y) / 2;
    const roomWP1 = { x: wallRect.left, y: toiletMidY };
    const roomWP2 = { x: wallRect.right, y: toiletMidY };
    const centerX = (wallRect.left + wallRect.right) / 2;
    const roomHP1 = { x: centerX, y: wallRect.top };
    const roomHP2 = { x: centerX, y: wallRect.bottom };

    const annotated = bag.track(new cv.Mat());
    rgba.copyTo(annotated);

    const toiletArea = toPixelRect(detection.toiletArea, width, height);
    drawBox(
      cv,
      annotated,
      { x: wallRect.left, y: wallRect.top, width: roomWidthPx, height: roomHeightPx },
      COLORS.wallArea,
      "Wall area",
    );
    drawBox(cv, annotated, toiletArea, COLORS.toiletArea, "Toilet area");

    // Draw order matters here: toiletWidthLine is measured at the same
    // height as roomWidthLine (same wall plane, comparable perspective), so
    // the two are often collinear with toilet width as a sub-segment of
    // room width. roomWidthLine is drawn first so the shorter, more
    // specific toiletWidthLine stays visible on top instead of being
    // painted over; labels are offset vertically apart so they don't land
    // on the same spot.
    const labelPx = Math.max(16, Math.round(width * 0.02));
    drawDimensionLine(
      cv,
      annotated,
      new cv.Point(Math.round(roomWP1.x), Math.round(roomWP1.y)),
      new cv.Point(Math.round(roomWP2.x), Math.round(roomWP2.y)),
      COLORS.roomWidth,
      "Room width",
      { x: 0, y: -labelPx },
    );
    drawDimensionLine(
      cv,
      annotated,
      new cv.Point(Math.round(toiletP1.x), Math.round(toiletP1.y)),
      new cv.Point(Math.round(toiletP2.x), Math.round(toiletP2.y)),
      COLORS.toiletWidth,
      "Toilet width",
      { x: 0, y: labelPx * 2 },
    );
    drawDimensionLine(
      cv,
      annotated,
      new cv.Point(Math.round(roomHP1.x), Math.round(roomHP1.y)),
      new cv.Point(Math.round(roomHP2.x), Math.round(roomHP2.y)),
      COLORS.roomHeight,
      "Room height",
    );
    const annotatedImage = await encodeMatToDataUrl(annotated);

    return {
      ok: true,
      annotatedImage,
      ratios: {
        widthOverToilet: roomWidthPx / toiletWidthPx,
        heightOverWidth: roomHeightPx / roomWidthPx,
      },
      debug: {
        imageWidth: width,
        imageHeight: height,
        confidence: detection.confidence,
        notes: detection.notes,
      },
    };
  } finally {
    bag.deleteAll();
  }
}
