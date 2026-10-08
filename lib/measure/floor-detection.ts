import { z } from "zod";

import { callVisionJson } from "@/lib/openai-client";
import { buildGriddedImage, type GriddedImage } from "./grid-image";
import { percentQuadSchema } from "./percent-line";
import { medianOfSamples } from "./aggregate-samples";

// ---------------------------------------------------------------------------
// Floor/zenith photo analysis via OpenAI vision — see wall-detection.ts for
// why this replaced local segmentation + classical CV. The zenith angle was
// especially bad for the old approach (the segmentation model, trained
// mostly on eye-level photos, labeled most of a real top-down floor shot as
// "wall"); a vision-language model asked directly for the floor's corners
// isn't relying on a label that happens to be out-of-distribution for this
// camera angle.
//
// floorCorners is a quad (4 independent corners), not an axis-aligned box —
// same reasoning as wall-detection.ts's wallCorners: a phone held "overhead"
// is rarely perfectly level, so the floor's true outline is a slight
// trapezoid in the photo, not a rectangle. floorWidthLine/floorLengthLine
// are derived from floorCorners by wall-ratios.ts-equivalent interpolation
// in floor-ratio.ts, not asked for separately — removing a second value
// that could disagree with the box.
// ---------------------------------------------------------------------------

const floorDetectionSchema = z.object({
  floorCorners: percentQuadSchema,
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type FloorDetection = z.infer<typeof floorDetectionSchema> & {
  imageWidth: number;
  imageHeight: number;
};

const SYSTEM_PROMPT = `You are a computer-vision assistant specialized in precise spatial measurement from photos of Japanese toilet rooms (トイレ). You will be shown a photo with a reference grid overlaid: red lines every 10% of width/height, with yellow percentage labels (0-100) along the top edge (x-axis) and left edge (y-axis). Use the grid lines to estimate coordinates precisely, as percentages (0-100, decimals allowed) of the image width (x) and height (y).

This is a "floor / zenith" photo: taken from directly overhead, looking straight down at the floor, showing the toilet from above and the floor area around it. Real customer photos often have clutter on the floor (towels, bins, bottles, bath mats) — look past it to the actual floor/wall boundaries. The camera is rarely held perfectly level, so the floor's true outline in the photo is usually a slight trapezoid, not a perfect rectangle — do not force it into one.

IMPORTANT — do not take the lazy shortcut of assuming the floor fills the entire frame edge-to-edge. Most photos show at least one real boundary of the floor somewhere in frame: a wall base, a skirting/trim line, a door threshold strip, a change in flooring material or color, a cabinet or fixture base. Actively look for these boundaries. Only use the image's own edge (0% or 100%) as a boundary if you can't find any such visual cue AND the floor plausibly continues past the frame — and say so explicitly in "notes" when you do this, naming which edge(s) you defaulted on and why.

A specific trap: at a steep top-down angle, a tiled WALL can look like more floor, especially when it's a similar color/material to the real floor. Watch for these wall signals even inside what looks like a continuous tiled surface: anything that appears mounted ON a vertical surface rather than resting ON a horizontal one (grab bars, soap dishes, remote control panels, toilet paper holders, shelves, towel racks) — the surface it's mounted to is a wall, and floorCorners must stop before it, not include it. Also watch for a change in tile size, pattern, or grout orientation partway across the frame — that is very often the real floor-to-wall boundary even when both surfaces are tiled in a similar color.

floorCorners: the floor's 4 true corners — topLeft, topRight, bottomLeft, bottomRight — each the crossing point of two real boundary lines (e.g. the near-side threshold line and the left-side wall-base line), found by tracing each boundary across the frame and seeing where they cross, not by guessing a single point. Determine each corner INDEPENDENTLY — don't let a rough overall impression of "about how big the floor looks" set all four at once, and don't let where the toilet happens to sit bias corners that are actually far from it. For each edge between two corners, specifically look for and be ready to name (in "notes") the real visual feature that marks it: a baseboard/skirting strip, a door threshold, a cabinet or fixture base, a material or color change. A quad that's roughly the right size but shifted off-center from the real floor region is still wrong — the edges must sit exactly on the real boundaries, not just produce a plausible-looking area.

Respond ONLY with a JSON object of this exact shape, no other text:
{
  "floorCorners": {
    "topLeft": {"xPercent": number, "yPercent": number},
    "topRight": {"xPercent": number, "yPercent": number},
    "bottomLeft": {"xPercent": number, "yPercent": number},
    "bottomRight": {"xPercent": number, "yPercent": number}
  },
  "confidence": number between 0 and 1 (your own confidence all 4 corners are correctly placed),
  "notes": "short string — explicitly mention if any edge defaulted to the frame boundary"
}`;

// See wall-detection.ts's SAMPLE_COUNT comment — the same single-call
// noisiness applies here (floor boundaries against clutter/wall confusion
// are judgment calls, not deterministic reads), so the same median-of-N
// sampling is used, raised to 5 for the same reason.
const SAMPLE_COUNT = 5;

async function detectFloorLinesOnce(
  gridded: GriddedImage,
): Promise<z.infer<typeof floorDetectionSchema>> {
  const raw = await callVisionJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: "Analyze this floor/zenith photo and return the JSON as specified.",
    imageDataUrl: gridded.dataUrl,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI did not return valid JSON: ${raw.slice(0, 200)}`);
  }

  const result = floorDetectionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`OpenAI response did not match the expected shape: ${result.error.message}`);
  }
  return result.data;
}

export async function detectFloorLines(imageBuffer: Buffer): Promise<FloorDetection> {
  const gridded = await buildGriddedImage(imageBuffer);

  const settled = await Promise.allSettled(
    Array.from({ length: SAMPLE_COUNT }, () => detectFloorLinesOnce(gridded)),
  );
  const samples = settled
    .filter(
      (s): s is PromiseFulfilledResult<z.infer<typeof floorDetectionSchema>> =>
        s.status === "fulfilled",
    )
    .map((s) => s.value);
  if (samples.length === 0) {
    const firstError = settled.find((s) => s.status === "rejected") as
      PromiseRejectedResult | undefined;
    throw firstError?.reason ?? new Error("All detection samples failed.");
  }
  const combined = medianOfSamples(samples);

  return { ...combined, imageWidth: gridded.originalWidth, imageHeight: gridded.originalHeight };
}
