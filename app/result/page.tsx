"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { readSubmissions, type StoredSubmission } from "@/lib/api-client";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GridCell({
  label,
  statusLine,
  statusOk,
  image,
  imageAlt,
  children,
}: {
  label: string;
  statusLine: string;
  statusOk: boolean;
  image: string;
  imageAlt: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface-panel flex flex-col p-4">
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          statusOk ? "text-success" : "text-muted-foreground",
        )}
      >
        {statusOk && <Check className="size-3.5" />}
        {label} — {statusLine}
      </div>
      <img src={image} alt={imageAlt} className="mt-2 w-full rounded-lg border border-border" />
      {children}
    </div>
  );
}

export default function ResultPage() {
  const [submissions, setSubmissions] = useState<StoredSubmission[] | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const all = readSubmissions();
    setSubmissions(all);
    setSelectedId(all.length > 0 ? all[all.length - 1]!.id : null);
  }, []);

  if (submissions === undefined) return null;

  if (submissions.length === 0) {
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

  const selected =
    submissions.find((s) => s.id === selectedId) ?? submissions[submissions.length - 1]!;
  const { result, photos } = selected;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-2xl font-semibold">計測結果</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex gap-3 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {[...submissions].reverse().map((submission) => (
            <button
              key={submission.id}
              type="button"
              onClick={() => setSelectedId(submission.id)}
              className={cn(
                "surface-panel flex shrink-0 items-center gap-2 p-3 text-left transition-colors",
                selected.id === submission.id ? "ring-2 ring-primary" : "hover:bg-secondary/60",
              )}
            >
              {submission.result.ok ? (
                <Check className="size-4 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
              )}
              <span className="text-sm whitespace-nowrap">
                {formatTimestamp(submission.submittedAt)}
              </span>
            </button>
          ))}
        </div>

        <div>
          {!result.ok && (
            <div className="surface-panel flex gap-3 p-6 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
              <p>{result.error}</p>
            </div>
          )}

          {result.ok && (
            <>
              {result.size ? (
                <div className="mb-4 rounded-xl bg-primary p-5 text-primary-foreground">
                  <p className="text-xs text-primary-foreground/70">
                    {result.size.toiletBrand} {result.size.toiletModel} の既知サイズから算出した実寸
                  </p>
                  <dl className="mt-2 grid grid-cols-3 gap-4">
                    {[
                      ["幅", result.size.widthMm],
                      ["高さ", result.size.heightMm],
                      ["奥行", result.size.lengthMm],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="text-xs text-primary-foreground/70">{k}</dt>
                        <dd className="font-display text-xl font-semibold">{v}mm</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <div className="surface-panel mb-4 flex gap-2 p-4 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="text-muted-foreground">{result.sizeUnavailableReason}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <GridCell
                  label="奥の壁"
                  statusLine="解析済み"
                  statusOk
                  image={result.annotatedWallImage}
                  imageAlt="奥の壁の解析結果(便器幅・幅・高さを表示)"
                >
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">幅 ÷ 便器幅</dt>
                      <dd className="font-display text-lg font-semibold">
                        {result.ratios.widthOverToilet.toFixed(2)}倍
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">高さ ÷ 幅</dt>
                      <dd className="font-display text-lg font-semibold">
                        {result.ratios.heightOverWidth.toFixed(2)}倍
                      </dd>
                    </div>
                  </dl>
                </GridCell>

                <GridCell
                  label="床"
                  statusLine="解析済み"
                  statusOk
                  image={result.annotatedFloorImage}
                  imageAlt="床の解析結果(幅・奥行を表示)"
                >
                  <dl className="mt-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">奥行 ÷ 幅</dt>
                      <dd className="font-display text-lg font-semibold">
                        {result.ratios.lengthOverWidth.toFixed(2)}倍
                      </dd>
                    </div>
                  </dl>
                </GridCell>

                <GridCell
                  label="型番"
                  statusLine="解析済み"
                  statusOk
                  image={photos["model-label"]}
                  imageAlt="型番の写真"
                >
                  {result.size ? (
                    <p className="mt-3 text-center text-sm font-medium">
                      {result.size.toiletBrand} {result.size.toiletModel}
                      <span className="ml-2 text-muted-foreground">
                        幅 {result.size.toiletWidthMm}mm
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-center text-sm font-medium">
                      型番を特定できませんでした
                    </p>
                  )}
                </GridCell>

                <GridCell
                  label="給排水"
                  statusLine="未解析"
                  statusOk={false}
                  image={photos["plumbing"]}
                  imageAlt="給排水まわりの写真"
                >
                  <p className="mt-3 text-xs text-muted-foreground">
                    スタッフが見積もり作成の参考資料として確認します。
                  </p>
                </GridCell>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" variant="outline">
          <Link href="/capture">撮影ガイドに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
