import { z } from "zod";

import { callVisionJson } from "@/lib/openai-client";
import { buildGriddedImage, type GriddedImage } from "./grid-image";
import { percentLineSchema, percentRectSchema, percentQuadSchema } from "./percent-line";
import { medianOfSamples } from "./aggregate-samples";

// ---------------------------------------------------------------------------
// Back-wall photo analysis via OpenAI vision — replaces the earlier local
// segmentation model + classical Hough-line approach, which could not
// reliably tell wall from floor from toilet on real (patterned-wallpaper,
// colored-toilet) photos, and separately was discovered to have been fed
// every real photo sideways (see grid-image.ts's EXIF rotation note).
//
// wallCorners asks for the back wall's 4 corners independently — each one
// found as the crossing point of two real seam lines (e.g. topLeft = where
// the ceiling-wall seam crosses the left side-wall seam) — rather than
// forcing a single shared x-coordinate onto what might be a slightly
// slanted edge. wall-ratios.ts then collapses the 4 corners into the
// rectangle that best represents them (the wall IS physically a rectangle;
// letting the raw 4 points stand as drawn let the model invent more
// perspective skew than this app's straight-on capture guidance should
// ever produce — see percent-line.ts's rectFromQuad). roomWidthLine/
// roomHeightLine are not asked for separately — deriving them from
// wallCorners keeps them geometrically consistent with it instead of being
// a second value that could disagree with it.
// ---------------------------------------------------------------------------

const wallDetectionSchema = z.object({
  toiletArea: percentRectSchema,
  toiletWidthLine: percentLineSchema,
  wallCorners: percentQuadSchema,
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type WallDetection = z.infer<typeof wallDetectionSchema> & {
  imageWidth: number;
  imageHeight: number;
};

const SYSTEM_PROMPT = `You are a computer-vision assistant specialized in precise spatial measurement from photos of Japanese toilet rooms (トイレ). You will be shown a photo with a reference grid overlaid: red lines every 10% of width/height, with yellow percentage labels (0-100) along the top edge (x-axis) and left edge (y-axis). Use the grid lines to estimate coordinates precisely, as percentages (0-100, decimals allowed) of the image width (x) and height (y).

This is a "back wall" photo: taken standing at the room's entrance, facing the back wall where the toilet sits, ideally framed from floor to ceiling, showing the full width of the room (left side wall to right side wall). Real customer photos are sometimes imperfectly framed (cropped before reaching the floor or ceiling, clutter on shelves, etc.) — do your best with what's visible and say so in "notes" rather than refusing.

toiletWidthLine has a precise definition, not "wherever looks widest": it is the width of the tank measured right at its TOP edge, at the line where the tank's top/back meets the back wall — not the front-facing bulge of the tank body lower down, not the bowl, not the seat/lid. This is the cleanest, most unambiguous edge the tank has (a straight horizontal line against the wall, not a curved or foreshortened surface). If a shelf or cistern lid sits directly on/around the tank (very common), its underside is usually right at this exact line — when present, use the shelf's own left/right edges as toiletWidthLine, since a shelf's straight edges are far easier to pinpoint precisely than ceramic.

A specific trap that has caused real measurement errors: many toilet tanks are a similar dark color to a dark or patterned wall behind them (navy, black, dark brown tanks against dark wallpaper), making this top edge hard to see by color alone. Use every available cue: specular highlights and reflections on the glossy ceramic, a subtle shadow line at the tank-to-wall junction, the chrome flush valve/handle (usually mounted near one edge of the tank, near this same top line), and especially a shelf directly above (see above). Do not default to a narrow "safe" guess in the middle — trace the actual edges. The opposite mistake is just as real: toiletWidthLine (and toiletArea below) must stay within the toilet unit's own body/shelf — never include wall, tile, or empty space beside it. A toilet is a compact fixture; in a typical small Japanese toilet room its width is a modest fraction of the room's own width (commonly very roughly a third to two-thirds, never close to the full room width).

wallCorners: the back wall's 4 true corners — topLeft, topRight, bottomLeft, bottomRight. Each corner is where 3 surfaces meet (e.g. topLeft = back wall + left side wall + ceiling; bottomRight = back wall + right side wall + floor) — find it as the CROSSING POINT of two real seam lines, not as a single guessed point:
- Trace the ceiling-wall seam (a mostly-horizontal line near the top) all the way from one side of the frame to the other.
- Trace the floor-wall seam (a mostly-horizontal line near the bottom) the same way.
- Trace each side-wall seam (a mostly-vertical line) from where it meets the ceiling seam down to where it meets the floor seam.
- The 4 corners are exactly where these lines cross.

A specific trap that has caused real measurement errors: in a narrow room photographed somewhat close to the back wall (very common for this app — small Japanese toilet rooms, phone cameras with a wide field of view), the photo often shows a SLIVER of each SIDE wall as well as the back wall — the side wall, receding away from the camera at a steep angle, is still technically "more wall" in the frame, but it is NOT part of the back wall's width and must NOT be included in wallCorners. Distinguishing them: the back wall is viewed close to straight-on, so its surface/pattern looks roughly uniform in sharpness and density across its whole width; a side wall is viewed at a steep raking angle, so it looks compressed/foreshortened — its pattern gets denser, blurrier, or more "squashed-looking" the further it recedes, and it's often a slightly different brightness than the back wall it meets at 90°. If you see this kind of gradient or compression effect near either edge of what looked like "the wall," that is a side wall — the true corner is at the NEAR edge of that gradient (where the compression starts), which can be noticeably inset from the outermost wall-colored content in the frame, not at the point where wall-colored pixels stop appearing. Do not treat "any surface that looks like wall" as the back wall; only the surface that's roughly parallel to the camera counts.

The opposite failure is just as real: when a corner is hard to see, it's tempting to default close to the photo's own edge rather than find the true crossing point — a back-wall photo taken from a small room's entrance almost always shows all 4 corners with real margin before the frame edge (the doorway/entrance space extends beyond them); before placing a corner within the outer ~8% of the frame, double-check you're not just defaulting there out of uncertainty. If a corner is genuinely out of frame (photo cropped too tight), extend that corner's two seam lines to the frame edge and say so in "notes".

On patterned/textured wallpaper where color alone won't show a seam, use: a subtle brightness/shading difference between two wall faces meeting at 90° (they catch ambient light differently); a vertical or horizontal discontinuity or compression in the wallpaper pattern/texture at the seam (see the side-wall trap above); any fixture that marks it (light switch, outlet, trim/molding, a cabinet or mirror edge flush with the corner). Two more concrete, very reliable cues:
- Wall-mounted decor (a framed picture, ornament, shelf, switch plate) positioned off to one side, noticeably closer to the frame's left/right edge than the toilet/window cluster near the center, is very often mounted on a SIDE wall, not the back wall — especially if its shape looks visually compressed, skewed, or not quite proportionate compared to objects nearer the center (a sign it's being viewed at an angle, not straight-on). When you see this, the true corner is at or very near that item's position — use it as a concrete anchor instead of guessing from pattern alone.
- The ceiling is sometimes sloped (not level) — e.g. a toilet room tucked under a staircase, where the ceiling-wall seam runs diagonally across the frame instead of staying at a constant height, so topLeft.yPercent and topRight.yPercent can legitimately differ a lot. This is normal; trace the seam as the sloped line it actually is (follow it to each side wall independently) rather than assuming it must be level or forcing both corners to the same height.

Work out toiletWidthLine first, then toiletArea (whose top-left/top-right x-coordinates must exactly equal toiletWidthLine's own start/end x-coordinates — copy them, never re-estimate), then wallCorners.

Respond ONLY with a JSON object of this exact shape, no other text:
{
  "toiletWidthLine": {"start": {"xPercent": number, "yPercent": number}, "end": {"xPercent": number, "yPercent": number}},
  "toiletArea": {"topLeft": {"xPercent": number, "yPercent": number}, "bottomRight": {"xPercent": number, "yPercent": number}},
  "wallCorners": {
    "topLeft": {"xPercent": number, "yPercent": number},
    "topRight": {"xPercent": number, "yPercent": number},
    "bottomLeft": {"xPercent": number, "yPercent": number},
    "bottomRight": {"xPercent": number, "yPercent": number}
  },
  "confidence": number between 0 and 1 (your own confidence everything above is placed correctly),
  "notes": "short string, any caveats"
}`;

// How many independent samples to take and median-combine. Justified
// empirically (see aggregate-samples.ts): repeated single calls on the same
// real photo swung the resulting ratio ~40%, and one sample out of three
// read a toilet's width as roughly half the other two — a single API call
// is not reliable enough on genuinely ambiguous photos (faint wall corners,
// dark toilet against dark wallpaper) on its own. Raised from 3 to 5 after
// confirming even 3-sample medians still swung noticeably between runs on
// the hardest real photo tested (dark toilet, dark patterned wallpaper,
// narrow room) — different sub-measurements (toilet width vs. wall corners)
// came out wrong on different draws, so no single bad sample was the cause,
// just the underlying noise floor on genuinely low-contrast photos.
const SAMPLE_COUNT = 5;

async function detectWallLinesOnce(
  gridded: GriddedImage,
): Promise<z.infer<typeof wallDetectionSchema>> {
  const raw = await callVisionJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: "Analyze this back-wall photo and return the JSON as specified.",
    imageDataUrl: gridded.dataUrl,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI did not return valid JSON: ${raw.slice(0, 200)}`);
  }

  const result = wallDetectionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`OpenAI response did not match the expected shape: ${result.error.message}`);
  }
  return result.data;
}

export async function detectWallLines(imageBuffer: Buffer): Promise<WallDetection> {
  const gridded = await buildGriddedImage(imageBuffer);

  const settled = await Promise.allSettled(
    Array.from({ length: SAMPLE_COUNT }, () => detectWallLinesOnce(gridded)),
  );
  const samples = settled
    .filter(
      (s): s is PromiseFulfilledResult<z.infer<typeof wallDetectionSchema>> =>
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
