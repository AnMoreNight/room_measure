// ---------------------------------------------------------------------------
// Combines multiple independent detection samples (same photo, same prompt,
// repeated calls) into one more stable result by taking the per-field
// median across samples. Justified empirically: repeating the same wall
// photo's detection 3x produced ratios swinging ~40% run to run on
// genuinely ambiguous photos (faint wall corners, dark toilet against dark
// wallpaper) — the model's single-shot answer is noisy when visual evidence
// is weak, not systematically wrong, so the standard fix is self-consistency
// sampling: take several independent samples and let the median cancel out
// outlier runs (confirmed on real data — one sample read a toilet's width as
// half the other two samples; the median correctly ignored it).
//
// Works generically over any JSON-shaped detection result (percent-line/
// percent-rect schemas) by walking matching structures in parallel and
// taking the median of each leaf number; non-numeric leaves (confidence's
// sibling `notes` strings) just keep the first sample's value.
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reduceDeep(samples: any[]): any {
  const first = samples[0];

  if (typeof first === "number") {
    return median(samples);
  }
  if (Array.isArray(first)) {
    return first.map((_, i) => reduceDeep(samples.map((s) => s[i])));
  }
  if (first && typeof first === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(first)) {
      result[key] = reduceDeep(samples.map((s) => s[key]));
    }
    return result;
  }
  // Strings and other non-numeric leaves (e.g. "notes") aren't meaningfully
  // medianable — keep the first sample's value.
  return first;
}

/** Takes the per-field median across N independent detection samples of the same shape. */
export function medianOfSamples<T>(samples: T[]): T {
  if (samples.length === 0) {
    throw new Error("medianOfSamples: at least one sample is required");
  }
  if (samples.length === 1) {
    return samples[0]!;
  }
  return reduceDeep(samples);
}
