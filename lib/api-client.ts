export type MeasureRatios = {
  /** Room width ÷ toilet width, from the back-wall photo. */
  widthOverToilet: number;
  /** Room height ÷ room width, from the back-wall photo. */
  heightOverWidth: number;
  /** Room length (depth) ÷ room width, from the floor/zenith photo. */
  lengthOverWidth: number;
};

export type MeasureResult =
  | { ok: true; ratios: MeasureRatios; annotatedWallImage: string; annotatedFloorImage: string }
  | { ok: false; error: string };

/** Calls /api/measure — the only backend call this app makes. */
export async function measureRatios(backWallPhoto: string, floorPhoto: string): Promise<MeasureResult> {
  try {
    const res = await fetch("/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backWallPhoto, floorPhoto }),
    });
    return (await res.json()) as MeasureResult;
  } catch {
    return {
      ok: false,
      error: "サーバーに接続できませんでした。通信環境をご確認のうえ、もう一度お試しください。",
    };
  }
}

const STORAGE_KEY = "camesuke:lastSubmission";

export type StoredSubmission = {
  result: MeasureResult;
  submittedAt: string;
};

export function storeSubmission(submission: StoredSubmission) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(submission));
}

export function readStoredSubmission(): StoredSubmission | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSubmission;
  } catch {
    return null;
  }
}
