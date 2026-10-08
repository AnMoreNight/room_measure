import { NextResponse } from "next/server";
import { z } from "zod";

import { measureWallRatios } from "@/lib/measure/wall-ratios";
import { measureFloorRatio } from "@/lib/measure/floor-ratio";

// Each of wall/floor detection samples the vision model 3x (see
// aggregate-samples.ts); o3 is slow (tens of seconds to a few minutes per
// call), so this route needs much longer than Next's/Vercel's defaults.
// 300s is the highest value supported on Vercel without Fluid Compute —
// if that's still not enough in production, Fluid Compute raises the
// platform ceiling further, but this is already the max plain Node.js
// serverless functions support.
export const maxDuration = 300;

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp);base64,/i, "対応していない画像形式です。")
  .max(12_000_000, "画像サイズが大きすぎます。");

const requestSchema = z.object({
  backWallPhoto: dataUrlSchema,
  floorPhoto: dataUrlSchema,
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

    return NextResponse.json({
      ok: true,
      ratios: {
        widthOverToilet: wall.ratios.widthOverToilet,
        heightOverWidth: wall.ratios.heightOverWidth,
        lengthOverWidth: floor.ratio.lengthOverWidth,
      },
      annotatedWallImage: wall.annotatedImage,
      annotatedFloorImage: floor.annotatedImage,
    });
  } catch (error) {
    console.error("measure failed", error);
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
