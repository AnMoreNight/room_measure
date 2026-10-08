import { NextResponse } from "next/server";
import { z } from "zod";

import { measureWallRatios } from "@/lib/measure/wall-ratios";
import { measureFloorRatio } from "@/lib/measure/floor-ratio";
import { resolveRoomSize } from "@/lib/measure/room-size";

// Each of wall/floor detection samples the vision model 3x (see
// aggregate-samples.ts); o3 is slow (tens of seconds to a few minutes per
// call), so this route needs much longer than Next's/Vercel's defaults.
// 300s is the highest value supported on Vercel without Fluid Compute —
// if that's still not enough in production, Fluid Compute raises the
// platform ceiling further, but this is already the max plain Node.js
// serverless functions support.
export const maxDuration = 300;

// Vercel's serverless functions hard-cap the total request body at 4.5MB
// (a platform limit, not configurable here) — confirmed in production as a
// raw 413 before this route even runs. The client (capture/page.tsx) now
// resizes photos before upload specifically to stay well under that, so
// this per-field max is a defensive backstop giving a clear Japanese error
// if it's ever bypassed (e.g. a direct API call), not the primary guard.
const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp);base64,/i, "対応していない画像形式です。")
  .max(3_000_000, "画像サイズが大きすぎます。");

const requestSchema = z.object({
  backWallPhoto: dataUrlSchema,
  floorPhoto: dataUrlSchema,
  modelLabelPhoto: dataUrlSchema.optional(),
});

function dataUrlToBuffer(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "リクエストが不正です。" },
      { status: 400 },
    );
  }

  try {
    const [wall, floor] = await Promise.all([
      measureWallRatios(dataUrlToBuffer(parsed.data.backWallPhoto)),
      measureFloorRatio(dataUrlToBuffer(parsed.data.floorPhoto)),
    ]);

    if (!wall.ok) return NextResponse.json({ ok: false, error: wall.error }, { status: 422 });
    if (!floor.ok) return NextResponse.json({ ok: false, error: floor.error }, { status: 422 });

    const ratios = {
      widthOverToilet: wall.ratios.widthOverToilet,
      heightOverWidth: wall.ratios.heightOverWidth,
      lengthOverWidth: floor.ratio.lengthOverWidth,
    };

    // Real-world size is a bonus on top of the ratios, never a condition for
    // returning them — any failure here (no label photo, unreadable label,
    // model not in the sheet, sheet API error) just means size stays null
    // with a reason, while ratios/annotated images are always returned.
    const { size, reason: sizeUnavailableReason } = await resolveRoomSize(
      parsed.data.modelLabelPhoto ? dataUrlToBuffer(parsed.data.modelLabelPhoto) : null,
      ratios,
    );

    return NextResponse.json({
      ok: true,
      ratios,
      annotatedWallImage: wall.annotatedImage,
      annotatedFloorImage: floor.annotatedImage,
      size,
      sizeUnavailableReason,
    });
  } catch (error) {
    console.error("measure failed", error);
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
