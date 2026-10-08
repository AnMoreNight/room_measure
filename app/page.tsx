import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ClipboardCheck, Layers, ScanLine, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloorPlan } from "@/components/FloorPlan";
import { captureSteps } from "@/lib/camesuke-data";

export const metadata: Metadata = {
  title: "CAMESUKE — 写真でトイレの自動採寸",
  description:
    "お客様のスマホ写真をガイド付きで収集し、型番から基準寸法を取得。信頼度スコア付きの簡易平面図で現地調査なしの見積もり作成を支援します。",
  openGraph: {
    title: "CAMESUKE — 写真でトイレの自動採寸",
    description: "4枚のガイド付き写真と型番から基準寸法を取得し、リフォーム見積もりを効率化。",
  },
};

const pipeline = [
  {
    icon: Camera,
    title: "ガイド付き撮影",
    text: "必要な4枚を1枚ずつ、見本画像つきで案内。",
  },
  {
    icon: ScanLine,
    title: "型番から基準寸法",
    text: "入力された型番をメーカーデータベースと照合。",
  },
  {
    icon: Layers,
    title: "写真はスタッフが確認",
    text: "撮影された4枚は案件の参考資料として記録。",
  },
  {
    icon: ClipboardCheck,
    title: "スタッフ確認",
    text: "承認するか現地調査を依頼するかを判断。",
  },
];

export default function Home() {
  return (
    <div>
      <section className="hero-surface relative overflow-hidden">
        <div className="grid-paper absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <h1 className="font-display text-4xl leading-tight font-semibold text-primary-foreground sm:text-5xl">
              現地調査に行かず、お客様の写真で採寸。
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/80">
              CAMESUKEはお客様に4枚の写真撮影をご案内し、便器の型番を基準にメーカーデータベースから
              既知寸法を取得。信頼度スコア付きの簡易平面図を生成し、スタッフがそのまま見積もり作成に進めます。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/capture">撮影ガイドを開始</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/staff">スタッフ確認画面へ</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-primary-foreground">
              {[
                ["±3cm", "目標誤差"],
                ["4枚", "ガイド付き写真"],
                ["3社", "メーカーデータベース"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-semibold">{v}</dt>
                  <dd className="text-xs text-primary-foreground/70">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="surface-panel p-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              自動生成の平面図
            </p>
            <FloorPlan width={1480} depth={2930} height={2440} className="mt-2 w-full" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold">案件の流れ</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((s) => (
            <div key={s.title} className="surface-panel p-5">
              <s.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">必要な4枚の写真</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                各写真はブレ・明るさ・構図・重なりを自動チェックしてから次へ進みます。
              </p>
            </div>
            <Button asChild>
              <Link href="/capture">撮影フローを開く</Link>
            </Button>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {captureSteps.map((step, i) => (
              <li key={step.id} className="surface-panel p-5">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {step.purpose.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="surface-panel flex flex-wrap items-center gap-6 p-8">
          <ShieldCheck className="size-8 text-primary" />
          <div className="min-w-64 flex-1">
            <h2 className="font-display text-xl font-semibold">信頼度スコアが次の一手を決めます</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              しきい値以上なら写真だけで見積もりへ。未満なら不正確な数値を返すのではなく、
              現地調査を推奨します。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/result">計測結果の例を見る</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
