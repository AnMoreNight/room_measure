import { NextResponse } from "next/server";
import { z } from "zod";

import { lookupToiletSize } from "@/lib/sheets-client";

const requestSchema = z.object({
  brand: z.string().trim().min(1, "メーカー名を入力してください。"),
  model: z.string().trim().min(1, "型番を入力してください。"),
});

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
    const toilet = await lookupToiletSize(parsed.data.brand, parsed.data.model);
    if (!toilet) {
      return NextResponse.json({ ok: true, matched: false, toilet: null });
    }
    return NextResponse.json({ ok: true, matched: true, toilet });
  } catch (error) {
    console.error("toilet-lookup failed", error);
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
