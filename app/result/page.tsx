"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readStoredSubmission, type StoredSubmission } from "@/lib/api-client";

export default function ResultPage() {
  const [submission, setSubmission] = useState<StoredSubmission | null | undefined>(undefined);

  useEffect(() => {
    setSubmission(readStoredSubmission());
  }, []);

  if (submission === undefined) return null;

  if (submission === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">計測結果</h1>
        <p className="mt-3 text-muted-foreground">
          まだ結果がありません。撮影ガイドから写真を送信すると、ここに結果が表示されます。
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/capture">撮影ガイドに戻る</Link>
        </Button>
      </div>
    );
  }

  const { result } = submission;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-2xl font-semibold">計測結果</h1>

      {!result.ok && (
        <div className="surface-panel mt-6 flex gap-3 p-6 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <p>{result.error}</p>
        </div>
      )}

      {result.ok && (
        <div className="surface-panel mt-6 p-6">
          <div className="flex items-center gap-2 text-sm text-success">
            <Check className="size-4" />
            写真の解析が完了しました
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["幅 ÷ 便器幅", result.ratios.widthOverToilet],
              ["高さ ÷ 幅", result.ratios.heightOverWidth],
              ["奥行 ÷ 幅", result.ratios.lengthOverWidth],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-display text-2xl font-semibold">{(v as number).toFixed(2)}倍</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm font-medium">奥の壁の写真</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ef4444]" /> 便器幅
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#22c55e]" /> 幅
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#3b82f6]" /> 高さ
                </span>
              </p>
              <img
                src={result.annotatedWallImage}
                alt="奥の壁の解析結果(便器幅・幅・高さを表示)"
                className="mt-2 w-full rounded-xl border border-border"
              />
            </div>

            <div>
              <p className="text-sm font-medium">床の写真</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#22c55e]" /> 幅
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#3b82f6]" /> 奥行
                </span>
              </p>
              <img
                src={result.annotatedFloorImage}
                alt="床の解析結果(幅・奥行を表示)"
                className="mt-2 w-full rounded-xl border border-border"
              />
            </div>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            撮影いただいた写真とあわせて、スタッフが見積もり作成の参考資料として確認します。
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" variant="outline">
          <Link href="/capture">撮影ガイドに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
