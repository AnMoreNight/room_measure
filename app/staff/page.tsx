import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cases } from "@/lib/camesuke-data";

export const metadata: Metadata = {
  title: "スタッフ確認コンソール — CAMESUKE",
  description: "送信された計測案件の一覧。信頼度スコア、内装材、現地調査の推奨を確認できます。",
};

const statusStyles: Record<string, string> = {
  review: "bg-accent text-accent-foreground",
  approved: "bg-success text-success-foreground",
  survey: "bg-destructive text-destructive-foreground",
};

const statusLabel: Record<string, string> = {
  review: "要確認",
  approved: "承認済み",
  survey: "現地調査を推奨",
};

export default function StaffList() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">スタッフ確認コンソール</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            過去48時間に送信された案件 {cases.length}件
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="案件番号・お客様名・地域で検索" className="pl-9" />
        </div>
      </div>

      {/* Mobile: one card per case. A 5-column table has no good narrow layout,
          so below md we swap to a stacked card list instead of shrinking it. */}
      <div className="mt-8 space-y-3 md:hidden">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/staff/${c.id}`}
            className="surface-panel block p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-primary">#{c.id}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusStyles[c.status]}`}
              >
                {statusLabel[c.status]}
              </span>
            </div>
            <div className="mt-2 font-medium">{c.customer}</div>
            <div className="text-xs text-muted-foreground">{c.address}</div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                {c.width} × {c.depth} × {c.height}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      c.confidence >= 80 ? "bg-success" : "bg-destructive"
                    }`}
                    style={{ width: `${c.confidence}%` }}
                  />
                </div>
                <span className="font-mono text-xs">{c.confidence}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="surface-panel mt-8 hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-3">案件</th>
              <th className="px-5 py-3">お客様</th>
              <th className="px-5 py-3">幅 × 奥行 × 高さ</th>
              <th className="px-5 py-3">信頼度</th>
              <th className="px-5 py-3">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-border transition-colors hover:bg-muted">
                <td className="px-5 py-4 font-mono text-xs">
                  <Link href={`/staff/${c.id}`} className="text-primary hover:underline">
                    #{c.id}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium">{c.customer}</div>
                  <div className="text-xs text-muted-foreground">{c.address}</div>
                </td>
                <td className="px-5 py-4 font-mono text-xs whitespace-nowrap">
                  {c.width} × {c.depth} × {c.height}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          c.confidence >= 80 ? "bg-success" : "bg-destructive"
                        }`}
                        style={{ width: `${c.confidence}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">{c.confidence}%</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusStyles[c.status]}`}
                  >
                    {statusLabel[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
