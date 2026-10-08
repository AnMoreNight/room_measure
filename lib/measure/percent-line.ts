import { z } from "zod";

// Shared shape for a line segment the vision model reports, in percentage
// coordinates (0-100) relative to the gridded image it was shown — see
// grid-image.ts. Used by both wall-detection.ts and floor-detection.ts.

export const percentPointSchema = z.object({
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
});

export const percentLineSchema = z.object({
  start: percentPointSchema,
  end: percentPointSchema,
});

export const percentRectSchema = z.object({
  topLeft: percentPointSchema,
  bottomRight: percentPointSchema,
});

// A room's back wall (or floor) isn't actually a rectangle in the photo —
// camera perspective makes it a trapezoid, converging slightly toward a
// vanishing point. Forcing an axis-aligned rectangle (percentRectSchema)
// onto that shape is itself a source of error: it asks the model for one
// x-coordinate that has to serve as "the left edge" at both the top and
// the bottom, when the true left edge is a slightly slanted line. A quad's
// 4 corners are each the intersection of 3 surfaces (e.g. back wall + side
// wall + ceiling) — asking for each corner directly, rather than forcing
// rectangularity, matches the actual geometry and lets each corner be
// found independently by tracing two real seam lines to where they cross.
export const percentQuadSchema = z.object({
  topLeft: percentPointSchema,
  topRight: percentPointSchema,
  bottomLeft: percentPointSchema,
  bottomRight: percentPointSchema,
});

export type PercentPoint = z.infer<typeof percentPointSchema>;
export type PercentLine = z.infer<typeof percentLineSchema>;
export type PercentRect = z.infer<typeof percentRectSchema>;
export type PercentQuad = z.infer<typeof percentQuadSchema>;

export type PixelPoint = { x: number; y: number };
export type PixelQuad = {
  topLeft: PixelPoint;
  topRight: PixelPoint;
  bottomLeft: PixelPoint;
  bottomRight: PixelPoint;
};

/** Converts a model-reported percentage point to real pixel coordinates in the original (EXIF-corrected) image. */
export function toPixelPoint(
  point: PercentPoint,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  return { x: (point.xPercent / 100) * imageWidth, y: (point.yPercent / 100) * imageHeight };
}

/** Converts a model-reported percentage rectangle to a pixel-space box in the original (EXIF-corrected) image. */
export function toPixelRect(
  rect: PercentRect,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const topLeft = toPixelPoint(rect.topLeft, imageWidth, imageHeight);
  const bottomRight = toPixelPoint(rect.bottomRight, imageWidth, imageHeight);
  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y),
  };
}

/** Converts a model-reported percentage quad to pixel-space corners in the original (EXIF-corrected) image. */
export function toPixelQuad(quad: PercentQuad, imageWidth: number, imageHeight: number): PixelQuad {
  return {
    topLeft: toPixelPoint(quad.topLeft, imageWidth, imageHeight),
    topRight: toPixelPoint(quad.topRight, imageWidth, imageHeight),
    bottomLeft: toPixelPoint(quad.bottomLeft, imageWidth, imageHeight),
    bottomRight: toPixelPoint(quad.bottomRight, imageWidth, imageHeight),
  };
}

/**
 * Collapses a detected quad into the axis-aligned rectangle that best
 * represents it (averaging each pair of corners that should share an edge).
 *
 * The wall/floor is physically a rectangle; a quad was asked for so each
 * corner could be found independently (as the intersection of two real seam
 * lines) instead of forcing one shared x/y onto a possibly-slanted edge.
 * But confirmed against real photos: with 4 fully independent corners, the
 * model sometimes invents much more perspective skew than this app's
 * straight-on/overhead capture guidance should ever produce — the result
 * visibly narrows from top to bottom in a way the real room doesn't.
 * Averaging corner pairs keeps the per-corner precision gain while damping
 * that false skew back down to the rectangle the room actually is.
 */
export function rectFromQuad(quad: PixelQuad): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  return {
    left: (quad.topLeft.x + quad.bottomLeft.x) / 2,
    right: (quad.topRight.x + quad.bottomRight.x) / 2,
    top: (quad.topLeft.y + quad.topRight.y) / 2,
    bottom: (quad.bottomLeft.y + quad.bottomRight.y) / 2,
  };
}
