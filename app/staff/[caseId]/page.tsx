import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloorPlan } from "@/components/FloorPlan";
import { captureSteps, cases } from "@/lib/camesuke-data";

type Props = { params: Promise<{ caseId: string }> };

function findCase(caseId: string) {
  return cases.find((c) => c.id === caseId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { caseId } = await params;
  const record = findCase(caseId);
  if (!record) {
    return { title: "案件が見つかりません — CAMESUKE", robots: { index: false } };
  }
  return {
    title: `案件 #${record.id} の確認 — CAMESUKE`,
    description: `計測値 ${record.width} × ${record.depth} × ${record.height} mm、信頼度 ${record.confidence}%。`,
  };
}

export default async function CaseDetail({ params }: Props) {
  const { caseId } = await params;
  const c = findCase(caseId);
  if (!c) notFound();
  const low = c.confidence < 80;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 案件一覧へ
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">案件 #{c.id}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {c.customer} · {c.address} · {c.submitted}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">現地調査を依頼</Button>
          <Button disabled={low}>
            <Check /> 計測を承認
          </Button>
        </div>
      </div>

      {low && (
        <div className="mt-6 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <p>
            信頼度がしきい値80%を下回っています。見積もり発行の前に現地調査をお勧めします。
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">部屋の寸法</h2>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              {[
                ["幅", c.width],
                ["奥行", c.depth],
                ["高さ", c.height],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-display text-2xl font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">信頼度</span>
                <span className="font-mono">{c.confidence}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${low ? "bg-destructive" : "bg-success"}`}
                  style={{ width: `${c.confidence}%` }}
                />
              </div>
            </div>
          </div>

          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">スタッフによる確認項目</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["便器の型番", c.toilet],
                ["床材", c.floor],
                ["壁材", c.wall],
                ["天井材", c.ceiling],
                ["給排水", c.pipe],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">警告</h2>
            {c.warnings.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-success">
                <Check className="size-4" /> なし
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {c.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">平面図</h2>
            <FloorPlan width={c.width} depth={c.depth} height={c.height} className="mt-3 w-full" />
          </div>
          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">お客様の写真</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: captureSteps.length }).map((_, i) => (
                <div
                  key={i}
                  className="grid-paper flex aspect-square items-center justify-center rounded-lg border border-border bg-muted font-mono text-xs text-muted-foreground"
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
