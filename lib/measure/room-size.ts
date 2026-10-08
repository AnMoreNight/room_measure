import { identifyToilet } from "./toilet-identify";
import { lookupToiletSize } from "@/lib/sheets-client";

// ---------------------------------------------------------------------------
// Converts the 3 scale-free ratios (from wall-ratios.ts/floor-ratio.ts) into
// real-world millimeters, using the toilet's own known width as the
// reference: identify brand/model from the label photo, look up its width
// in the reference Google Sheet (lib/sheets-client.ts), then scale all 3
// ratios by that one known length.
//
// Every step here can fail independently (no label photo, unreadable label,
// brand/model not in the sheet, sheet API error) — each failure just means
// "skip the size calculation," never "fail the request": the 3 ratios are
// useful on their own and must keep being returned regardless (see
// app/api/measure/route.ts). reason explains which step failed and why, in
// Japanese, for display directly on the result page.
// ---------------------------------------------------------------------------

export type RoomSizeMm = {
  widthMm: number;
  heightMm: number;
  lengthMm: number;
  toiletBrand: string;
  toiletModel: string;
  /** The identified toilet's own known tank/bowl width (mm), as looked up from the reference sheet — the scale reference the room's widthMm/heightMm/lengthMm were all derived from, shown on /result so the calculation is transparent. */
  toiletWidthMm: number;
};

export type RoomSizeResult = { size: RoomSizeMm; reason: null } | { size: null; reason: string };

export async function resolveRoomSize(
  modelLabelImageBuffer: Buffer | null,
  ratios: { widthOverToilet: number; heightOverWidth: number; lengthOverWidth: number },
): Promise<RoomSizeResult> {
  if (!modelLabelImageBuffer) {
    return { size: null, reason: "型番の写真が送信されていません。" };
  }

  let identification;
  try {
    identification = await identifyToilet(modelLabelImageBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { size: null, reason: `型番の読み取りに失敗しました。(${message})` };
  }

  if (!identification.brand || !identification.model) {
    return {
      size: null,
      reason: identification.notes
        ? `型番を読み取れませんでした。(${identification.notes})`
        : "型番を読み取れませんでした。ラベルがはっきり写った写真を撮り直してください。",
    };
  }

  let toilet;
  try {
    toilet = await lookupToiletSize(identification.brand, identification.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { size: null, reason: `サイズデータベースへの照会に失敗しました。(${message})` };
  }

  if (!toilet) {
    return {
      size: null,
      reason: `「${identification.brand} ${identification.model}」はサイズデータベースに登録されていません。`,
    };
  }

  // widthMm is the width of whatever PART the photographed label belongs
  // to (see sheets-client.ts's header comment) — confirmed against the real
  // sheet that a washlet seat's own width (~507mm) is a different physical
  // measurement from the tank/bowl/tankless-unit width (~390mm) that
  // wall-detection.ts's toiletWidthLine actually measures in the photo.
  // Scaling by a seat's width would silently produce a wrong size, not an
  // error, so this is rejected explicitly rather than letting it through.
  if (toilet.partType.includes("洗浄便座")) {
    return {
      size: null,
      reason: `「${toilet.brand} ${toilet.model}」は便座(洗浄便座)のラベルです。タンクまたは大便器本体のラベルを撮影し直してください。`,
    };
  }

  const widthMm = toilet.widthMm * ratios.widthOverToilet;
  const heightMm = widthMm * ratios.heightOverWidth;
  const lengthMm = widthMm * ratios.lengthOverWidth;

  return {
    size: {
      widthMm: Math.round(widthMm),
      heightMm: Math.round(heightMm),
      lengthMm: Math.round(lengthMm),
      toiletBrand: toilet.brand,
      toiletModel: toilet.model,
      toiletWidthMm: toilet.widthMm,
    },
    reason: null,
  };
}
