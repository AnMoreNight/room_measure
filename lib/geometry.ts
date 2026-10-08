// Pure math on pixel points found by the OpenCV modules in lib/measure/.
// Unit-agnostic: every ratio below divides two lengths measured in the same
// image's pixel space, so it doesn't matter that the inputs are pixels
// rather than real-world units — the scale cancels out.

export type Point = { x: number; y: number };

export function lineLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
