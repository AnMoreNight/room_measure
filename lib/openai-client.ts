import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Thin wrapper around OpenAI's vision + JSON-mode chat completions, used by
// lib/measure/wall-detection.ts and lib/measure/floor-detection.ts to find
// the measurement lines in a photo. Model is read from OPENAI_MODEL (.env)
// rather than hardcoded, so it can be swapped without a code change.
// ---------------------------------------------------------------------------

// Each detection call now samples the model 3x in parallel (see
// aggregate-samples.ts) and o3 is already slow per call (tens of seconds,
// occasionally much more under API load) — confirmed hitting the SDK's
// own client-side timeout in production ("Request timed out." is the
// OpenAI SDK's literal APIConnectionTimeoutError message, not a Next.js or
// hosting-platform limit). Set as high as the SDK allows rather than trust
// its default, and let it retry a couple of times on transient failures.
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RETRIES = 3;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });
  }
  return client;
}

function getModel(): string {
  return process.env["OPENAI_MODEL"] || "gpt-4o";
}

/** Sends one image + prompt pair to the vision model and returns the raw JSON text it replied with. Caller validates/parses the shape. */
export async function callVisionJson(params: {
  systemPrompt: string;
  userPrompt: string;
  imageDataUrl: string;
}): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: params.systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: params.userPrompt },
          { type: "image_url", image_url: { url: params.imageDataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }
  return content;
}
