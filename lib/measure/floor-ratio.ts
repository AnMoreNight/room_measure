import { decodeToMat, loadOpenCv } from "./opencv-loader";
import { MatBag } from "./mat-bag";
import { COLORS, drawBox, drawDimensionLine, encodeMatToDataUrl } from "./annotate";
import { detectFloorLines } from "./floor-detection";
import { toPixelQuad, rectFromQuad } from "./percent-line";

// ---------------------------------------------------------------------------
// From the floor/zenith photo (shot from directly overhead — see
// lib/camesuke-data.ts's "floor" step), derive one ratio:
//   - lengthOverWidth = room length (near-to-far depth) / room width
//
// Detection (floor-detection.ts) returns the floor's 4 corners, found
// independently for precision — but the floor itself IS a rectangle (this
// app's capture guide asks for a straight-overhead shot, so real
// perspective skew should be mild), so the quad is collapsed back into a
// rectangle here via rectFromQuad rather than trusted as drawn — see
// wall-ratios.ts's header comment for why (confirmed on a real photo: the
// raw quad narrowed dramatically from top to bottom in a way the actual
// floor doesn't).
// ---------------------------------------------------------------------------

export type FloorRatio = {
  lengthOverWidth: number;
};

export type FloorRatioDebug = {
  imageWidth: number;
  imageHeight: number;
  confidence: number;
  notes: string | undefined;
};

export type FloorRatioResult =
  | { ok: true; ratio: FloorRatio; debug: FloorRatioDebug; annotatedImage: string }
  | { ok: false; error: string };

export async function measureFloorRatio(imageBuffer: Buffer): Promise<FloorRatioResult> {
  const cv = await loadOpenCv();
  const bag = new MatBag();

  try {
    const rgba = bag.track(await decodeToMat(imageBuffer));
    const width = rgba.cols;
    const height = rgba.rows;

    let detection;
    try {
      detection = await detectFloorLines(imageBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `床写真の解析に失敗しました。写真を撮り直してください。(${message})`,
      };
    }

    const quad = toPixelQuad(detection.floorCorners, width, height);
    const floorRect = rectFromQuad(quad);
    const floorWidthPx = floorRect.right - floorRect.left;
    const floorLengthPx = floorRect.bottom - floorRect.top;

    if (floorWidthPx <= 0 || floorLengthPx <= 0) {
      return { ok: false, error: "検出結果が不正です。写真を撮り直してください。" };
    }

    const midY = (floorRect.top + floorRect.bottom) / 2;
    const widthP1 = { x: floorRect.left, y: midY };
    const widthP2 = { x: floorRect.right, y: midY };
    const centerX = (floorRect.left + floorRect.right) / 2;
    const lengthP1 = { x: centerX, y: floorRect.top };
    const lengthP2 = { x: centerX, y: floorRect.bottom };

    const annotated = bag.track(new cv.Mat());
    rgba.copyTo(annotated);

    drawBox(
      cv,
      annotated,
      { x: floorRect.left, y: floorRect.top, width: floorWidthPx, height: floorLengthPx },
      COLORS.floorBox,
      "Floor area",
    );

    // Width and length lines cross near the rectangle's center, so their
    // labels would otherwise land on top of each other — offset them apart
    // (same approach as wall-ratios.ts's room-width/toilet-width labels).
    const labelPx = Math.max(16, Math.round(width * 0.02));
    drawDimensionLine(
      cv,
      annotated,
      new cv.Point(Math.round(widthP1.x), Math.round(widthP1.y)),
      new cv.Point(Math.round(widthP2.x), Math.round(widthP2.y)),
      COLORS.roomWidth,
      "Width",
      { x: 0, y: -labelPx },
    );
    drawDimensionLine(
      cv,
      annotated,
      new cv.Point(Math.round(lengthP1.x), Math.round(lengthP1.y)),
      new cv.Point(Math.round(lengthP2.x), Math.round(lengthP2.y)),
      COLORS.roomHeight,
      "Length",
      { x: labelPx, y: labelPx },
    );
    const annotatedImage = await encodeMatToDataUrl(annotated);

    return {
      ok: true,
      annotatedImage,
      ratio: { lengthOverWidth: floorLengthPx / floorWidthPx },
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
