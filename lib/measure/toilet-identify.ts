import { z } from "zod";
import sharp from "sharp";

import { callVisionJson } from "@/lib/openai-client";

// ---------------------------------------------------------------------------
// Reads the toilet's brand/model off its label photo (lib/camesuke-data.ts's
// "model-label" capture step) via OpenAI vision — this is a text-reading
// (OCR-style) task, not the spatial coordinate estimation wall-detection.ts/
// floor-detection.ts do, so none of their grid-overlay or multi-sample
// machinery applies here: just a plain, moderately-downscaled photo (label
// photos are close-ups, not full rooms — no need for the 1536px ceiling
// used elsewhere) sent once. Returning null for brand/model when the label
// isn't legible is correct and expected; a guessed value is worse than one
// honestly reported as unreadable, since a wrong brand/model silently
// produces a wrong real-world size later.
// ---------------------------------------------------------------------------

const toiletIdentifySchema = z.object({
  brand: z.string().trim().min(1).nullable(),
  model: z.string().trim().min(1).nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ToiletIdentification = z.infer<typeof toiletIdentifySchema>;

const SYSTEM_PROMPT = `You are reading a manufacturer label/sticker from a close-up photo of a Japanese toilet. These labels are usually found on the tank's side or back, inside the lid, or on a small plate near the base, and typically show the brand name and a model number (e.g. TOTO "CS330B", LIXIL "YBC-Z30S", Panasonic "XCH1500WS").

Read the brand and model number EXACTLY as printed, character for character — do not normalize, expand, translate, or guess at characters you can't clearly read. If the brand or model is blurry, cropped, obstructed, washed out by flash glare, or otherwise not legibly readable, return null for that field rather than guessing a plausible-looking value — a wrong guess is worse than honestly reporting you can't read it, since it would silently produce a wrong size later. Explain in "notes" what's limiting legibility, if anything.

Respond ONLY with a JSON object of this exact shape, no other text:
{
  "brand": string or null,
  "model": string or null,
  "confidence": number between 0 and 1,
  "notes": "short string, any caveats"
}`;

const MAX_DIMENSION = 1536;

async function buildLabelImageDataUrl(imageBuffer: Buffer): Promise<string> {
  const jpeg = await sharp(imageBuffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

export async function identifyToilet(imageBuffer: Buffer): Promise<ToiletIdentification> {
  const imageDataUrl = await buildLabelImageDataUrl(imageBuffer);

  const raw = await callVisionJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt:
      "Read the brand and model number from this toilet label photo and return the JSON as specified.",
    imageDataUrl,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI did not return valid JSON: ${raw.slice(0, 200)}`);
  }

  const result = toiletIdentifySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`OpenAI response did not match the expected shape: ${result.error.message}`);
  }
  return result.data;
}
