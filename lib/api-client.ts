export type MeasureRatios = {
  /** Room width ÷ toilet width, from the back-wall photo. */
  widthOverToilet: number;
  /** Room height ÷ room width, from the back-wall photo. */
  heightOverWidth: number;
  /** Room length (depth) ÷ room width, from the floor/zenith photo. */
  lengthOverWidth: number;
};

export type RoomSizeMm = {
  widthMm: number;
  heightMm: number;
  lengthMm: number;
  toiletBrand: string;
  toiletModel: string;
  toiletWidthMm: number;
};

export type MeasureResult =
  | {
      ok: true;
      ratios: MeasureRatios;
      annotatedWallImage: string;
      annotatedFloorImage: string;
      /** Real-world W/H/L in mm, from the toilet's known size — null when it couldn't be determined (see sizeUnavailableReason). The ratios above are always present regardless. */
      size: RoomSizeMm | null;
      sizeUnavailableReason: string | null;
    }
  | { ok: false; error: string };

/** Calls /api/measure — the only backend call this app makes. modelLabelPhoto is optional: without it (or if it can't be read, or isn't in the size database), size comes back null with a reason, but ratios are still computed. */
export async function measureRatios(
  backWallPhoto: string,
  floorPhoto: string,
  modelLabelPhoto?: string,
): Promise<MeasureResult> {
  try {
    const res = await fetch("/api/measure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backWallPhoto, floorPhoto, modelLabelPhoto }),
    });
    return (await res.json()) as MeasureResult;
  } catch {
    return {
      ok: false,
      error: "サーバーに接続できませんでした。通信環境をご確認のうえ、もう一度お試しください。",
    };
  }
}

const STORAGE_KEY = "camesuke:submissions";

/** The 4 photos the user actually uploaded, keyed by capture step id — kept alongside the result so /result can show "what you uploaded" next to "what we found," even though capture/page.tsx's own object URLs are gone by the time /result renders. */
export type UploadedPhotos = {
  "back-wall": string;
  floor: string;
  "model-label": string;
  plumbing: string;
};

export type StoredSubmission = {
  id: string;
  result: MeasureResult;
  photos: UploadedPhotos;
  submittedAt: string;
};

/** Appends a new submission to this session's history (/result lists all of them, most recent first) — never overwrites previous ones, since a customer may run the capture flow more than once in a visit. */
export function storeSubmission(submission: Omit<StoredSubmission, "id">): StoredSubmission {
  const stored: StoredSubmission = { ...submission, id: crypto.randomUUID() };
  const all = readSubmissions();
  all.push(stored);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return stored;
}

/** All submissions from this session, oldest first. */
export function readSubmissions(): StoredSubmission[] {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
