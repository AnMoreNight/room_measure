import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ImageIcon,
  Lightbulb,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { captureSteps, qualityChecks } from "@/lib/camesuke-data";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "ガイド付き撮影 — CAMESUKE" },
      {
        name: "description",
        content:
          "お客様向けのステップ式カメラガイド。見本画像、撮影、自動品質チェック、撮り直しを1枚ずつ進めます。",
      },
      { property: "og:title", content: "ガイド付き撮影 — CAMESUKE" },
      {
        property: "og:description",
        content: "1枚ずつの案内と自動品質チェックで、誰でも正確な写真を撮影できます。",
      },
    ],
  }),
  component: CapturePage,
});

type Phase = "instructions" | "checking" | "review";

function CapturePage() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("instructions");
  const [done, setDone] = useState<string[]>([]);

  const step = captureSteps[index]!;
  const finished = done.length === captureSteps.length;
  const progress = (done.length / captureSteps.length) * 100;

  function capture() {
    setPhase("checking");
    setTimeout(() => setPhase("review"), 900);
  }

  function accept() {
    setDone((d) => (d.includes(step.id) ? d : [...d, step.id]));
    setPhase("instructions");
    setIndex((i) => Math.min(i + 1, captureSteps.length - 1));
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">すべての写真を受け付けました</h1>
        <p className="mt-3 text-muted-foreground">
          ありがとうございます。計測は数分ほどで完了します。結果はスタッフが確認したのち、
          お見積もりの作成に進みます。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/result">計測結果を見る</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setDone([]);
              setIndex(0);
              setPhase("instructions");
            }}
          >
            <RotateCcw /> デモを最初から
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button
          className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
            setPhase("instructions");
          }}
        >
          <ChevronLeft className="size-4" /> 戻る
        </button>
        <span className="font-mono">
          写真 {index + 1} / {captureSteps.length}
        </span>
      </div>
      <Progress value={progress} className="mt-3" />

      <div className="surface-panel mt-6 overflow-hidden">
        <div className="border-b border-border p-6">
          <h1 className="font-display text-2xl font-semibold">{step.title}</h1>
          <p className="mt-1 text-muted-foreground">{step.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {step.purpose.map((p) => (
              <span
                key={p}
                className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {phase === "instructions" && (
          <div className="p-6">
            <div className="grid-paper flex aspect-4/3 items-center justify-center rounded-xl border border-dashed border-border bg-muted">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="mx-auto size-10" />
                <p className="mt-2 text-sm">この角度の見本画像</p>
              </div>
            </div>
            <ul className="mt-5 space-y-2">
              {step.tips.map((t) => (
                <li key={t} className="flex gap-2 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-6 w-full" onClick={capture}>
              <Camera /> 写真を撮る
            </Button>
          </div>
        )}

        {phase === "checking" && (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <span className="size-10 animate-spin rounded-full border-3 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">写真の品質をチェックしています…</p>
          </div>
        )}

        {phase === "review" && (
          <div className="p-6">
            <div className="grid-paper flex aspect-4/3 items-center justify-center rounded-xl border border-border bg-secondary">
              <p className="text-sm text-muted-foreground">撮影した写真のプレビュー</p>
            </div>
            <ul className="mt-5 space-y-2">
              {qualityChecks.map((c) => (
                <li
                  key={c.label}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{c.label}</span>
                  {c.state === "pass" ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check className="size-4" /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <AlertTriangle className="size-4" /> 要確認
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={capture}>
                <RotateCcw /> 撮り直す
              </Button>
              <Button size="lg" className="flex-1" onClick={accept}>
                この写真を使う
              </Button>
            </div>
          </div>
        )}
      </div>

      <ol className="mt-6 grid grid-cols-6 gap-2">
        {captureSteps.map((s, i) => (
          <li
            key={s.id}
            className={`h-1.5 rounded-full ${
              done.includes(s.id) ? "bg-success" : i === index ? "bg-primary" : "bg-border"
            }`}
            title={s.title}
          />
        ))}
      </ol>
    </div>
  );
}
