import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Download, Ruler, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloorPlan } from "@/components/FloorPlan";
import { cases, confidenceFactors, referenceProducts } from "@/lib/camesuke-data";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "計測結果 — CAMESUKE" },
      {
        name: "description",
        content:
          "推定された幅・奥行き・高さ、信頼度の内訳、基準製品データ、自動生成された簡易平面図を表示します。",
      },
      { property: "og:title", content: "計測結果 — CAMESUKE" },
      {
        property: "og:description",
        content: "お客様の写真から算出した部屋寸法・信頼度スコア・簡易平面図。",
      },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const c = cases[0]!;
  const dims = [
    { label: "幅", value: c.width, range: "±22 mm" },
    { label: "奥行き", value: c.depth, range: "±34 mm" },
    { label: "高さ", value: c.height, range: "±18 mm" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">案件 #{c.id}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">計測結果</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.address} · 送信 {c.submitted}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download /> PDF出力
          </Button>
          <Button asChild>
            <Link to="/staff/$caseId" params={{ caseId: c.id }}>
              スタッフ確認を開く
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {dims.map((d) => (
              <div key={d.label} className="surface-panel p-5">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">{d.label}</p>
                <p className="mt-2 font-display text-3xl font-semibold">
                  {d.value.toLocaleString()}
                  <span className="ml-1 text-base font-normal text-muted-foreground">mm</span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{d.range}</p>
              </div>
            ))}
          </div>

          <div className="surface-panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">計測の信頼度</h2>
              <span className="font-display text-3xl font-semibold text-success">
                {c.confidence}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success" style={{ width: `${c.confidence}%` }} />
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {confidenceFactors.map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-sm">
                  {f.ok ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <X className="size-4 text-destructive" />
                  )}
                  {f.label}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
              しきい値80%を上回っています。現地調査なしで見積もりを作成できます。
            </p>
          </div>

          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">スケール基準</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              品番写真から識別し、製品データベースと照合しました。
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2 pr-4">メーカー</th>
                    <th className="py-2 pr-4">型番</th>
                    <th className="py-2 pr-4">分類</th>
                    <th className="py-2 pr-4 text-right">幅×奥行×高さ(mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {referenceProducts.map((p) => (
                    <tr
                      key={p.maker + p.model}
                      className={`border-t border-border ${
                        p.model === "CS330B" ? "bg-accent/40 font-medium" : ""
                      }`}
                    >
                      <td className="py-2 pr-4">{p.maker}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{p.model}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{p.category}</td>
                      <td className="py-2 pr-4 text-right font-mono text-xs">
                        {p.w} × {p.d || "—"} × {p.h}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-panel p-6">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">簡易平面図</h2>
            </div>
            <FloorPlan width={c.width} depth={c.depth} height={c.height} className="mt-3 w-full" />
          </div>

          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">検出された要素</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["便器", c.toilet],
                ["ドア", "内開き 750mm 正面壁"],
                ["排水", c.pipe],
                ["床材", c.floor],
                ["壁材", c.wall],
                ["天井材", c.ceiling],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="surface-panel p-6">
            <h2 className="font-display text-lg font-semibold">送信された写真</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
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
