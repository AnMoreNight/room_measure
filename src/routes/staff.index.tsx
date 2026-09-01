import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cases } from "@/lib/camesuke-data";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "スタッフ確認コンソール — CAMESUKE" },
      {
        name: "description",
        content:
          "送信された計測案件の一覧。信頼度スコア、内装材、現地調査の推奨を確認できます。",
      },
      { property: "og:title", content: "スタッフ確認コンソール — CAMESUKE" },
      {
        property: "og:description",
        content: "自動計測の結果を確認し、承認または現地調査を依頼します。",
      },
    ],
  }),
  component: StaffList,
});

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

function StaffList() {
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

      <div className="surface-panel mt-8 overflow-x-auto">
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
                  <Link
                    to="/staff/$caseId"
                    params={{ caseId: c.id }}
                    className="text-primary hover:underline"
                  >
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
