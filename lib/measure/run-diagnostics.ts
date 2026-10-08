import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { measureWallRatios, type WallRatiosResult } from "./wall-ratios";
import { measureFloorRatio, type FloorRatioResult } from "./floor-ratio";

// ---------------------------------------------------------------------------
// Runs the measurement pipeline against every photo in Photo02/ (real,
// unedited customer-style test photos). For each image this attempts BOTH
// the back-wall analysis and the floor analysis regardless of which kind
// the photo actually is, so a wrong interpretation is as visible as a right
// one instead of being hidden by a pre-guessed classification.
//
// Results are cached in-process, keyed by each file's mtime+size, so
// reviewing the page repeatedly doesn't re-call the OpenAI API (real
// latency and cost per call) on every request — only changed/added photos
// in Photo02/ trigger recomputation.
// ---------------------------------------------------------------------------

const PHOTO_DIR = path.join(process.cwd(), "Photo02");
const IMAGE_EXT = /\.(jpe?g|png)$/i;

// Confirmed by visual inspection of Photo02/: four bathrooms, each a
// back-wall shot + a zenith/floor shot, except set "c" which has two
// back-wall attempts (c07 is cropped short of the ceiling, c09 is a retake
// that includes it) sharing one floor shot — both are compared against it.
const KNOWN_SETS: { set: string; wall: string; floor: string }[] = [
  { set: "a", wall: "a10.JPG", floor: "a11.JPG" },
  { set: "b", wall: "b09.JPG", floor: "b10.JPG" },
  { set: "c (c07)", wall: "c07.JPG", floor: "c08.JPG" },
  { set: "c (c09)", wall: "c09.JPG", floor: "c08.JPG" },
  { set: "d", wall: "d09.JPG", floor: "d10.JPG" },
];

export type ImageDiagnostics = {
  filename: string;
  error?: string;
  wallResult?: WallRatiosResult;
  floorResult?: FloorRatioResult;
};

export type SetSummary = {
  set: string;
  wallFile: string;
  floorFile: string;
  ok: boolean;
  ratios?: { widthOverToilet: number; heightOverWidth: number; lengthOverWidth: number };
  error?: string;
};

export type DiagnosticsReport = {
  images: ImageDiagnostics[];
  sets: SetSummary[];
};

let cache: { signature: string; report: DiagnosticsReport } | null = null;

async function dirSignature(dir: string, files: string[]): Promise<string> {
  const stats = await Promise.all(files.map((f) => stat(path.join(dir, f))));
  return files.map((f, i) => `${f}:${stats[i]!.mtimeMs}:${stats[i]!.size}`).join("|");
}

async function diagnoseImage(filename: string, buffer: Buffer): Promise<ImageDiagnostics> {
  try {
    const [wallResult, floorResult] = await Promise.all([
      measureWallRatios(buffer),
      measureFloorRatio(buffer),
    ]);
    return { filename, wallResult, floorResult };
  } catch (error) {
    console.error(`diagnostics failed for ${filename}:`, error);
    return { filename, error: describeError(error) };
  }
}

/** Walks error.cause chains so the real underlying failure is visible, not just a generic top-level message. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  let cause = error.cause;
  while (cause) {
    parts.push(cause instanceof Error ? cause.message : String(cause));
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  return parts.join(" ← caused by: ");
}

function buildSetSummaries(images: ImageDiagnostics[]): SetSummary[] {
  const byFilename = new Map(images.map((img) => [img.filename, img]));

  return KNOWN_SETS.filter((s) => byFilename.has(s.wall) && byFilename.has(s.floor)).map((s) => {
    const wall = byFilename.get(s.wall)!.wallResult;
    const floor = byFilename.get(s.floor)!.floorResult;

    if (wall?.ok && floor?.ok) {
      return {
        set: s.set,
        wallFile: s.wall,
        floorFile: s.floor,
        ok: true,
        ratios: {
          widthOverToilet: wall.ratios.widthOverToilet,
          heightOverWidth: wall.ratios.heightOverWidth,
          lengthOverWidth: floor.ratio.lengthOverWidth,
        },
      };
    }

    return {
      set: s.set,
      wallFile: s.wall,
      floorFile: s.floor,
      ok: false,
      error:
        wall && !wall.ok ? wall.error : floor && !floor.ok ? floor.error : "処理に失敗しました。",
    };
  });
}

export async function runPhotoDiagnostics(): Promise<DiagnosticsReport> {
  const entries = await readdir(PHOTO_DIR);
  const files = entries.filter((f) => IMAGE_EXT.test(f)).sort();

  const signature = await dirSignature(PHOTO_DIR, files);
  if (cache && cache.signature === signature) {
    return cache.report;
  }

  const images: ImageDiagnostics[] = [];
  for (const filename of files) {
    const buffer = await readFile(path.join(PHOTO_DIR, filename));
    images.push(await diagnoseImage(filename, buffer));
  }

  const report: DiagnosticsReport = { images, sets: buildSetSummaries(images) };
  cache = { signature, report };
  return report;
}
