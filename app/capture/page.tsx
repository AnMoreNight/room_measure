"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ImageIcon,
  Info,
  Lightbulb,
  RotateCcw,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { captureGuidelines, captureSteps, qualityChecks } from "@/lib/camesuke-data";
import { measureRatios, storeSubmission } from "@/lib/api-client";

type Phase = "instructions" | "checking" | "review";
type SubmitPhase = "idle" | "submitting" | "done" | "error";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

export default function CapturePage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("instructions");
  const [done, setDone] = useState<string[]>([]);
  // Object URLs for the photo captured/dropped/selected per step id.
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const step = captureSteps[index]!;
  const finished = done.length === captureSteps.length;
  const progress = (done.length / captureSteps.length) * 100;

  // Release every object URL when the page unmounts, so navigating away
  // doesn't leak memory from previewed photos.
  useEffect(() => {
    return () => {
      Object.values(photosRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function submit() {
    setSubmitPhase("submitting");
    setSubmitError(null);
    try {
      const [backWallBlob, floorBlob] = await Promise.all([
        fetch(photos["back-wall"]!).then((r) => r.blob()),
        fetch(photos["floor"]!).then((r) => r.blob()),
      ]);
      const [backWallPhoto, floorPhoto] = await Promise.all([
        blobToDataUrl(backWallBlob),
        blobToDataUrl(floorBlob),
      ]);
      const result = await measureRatios(backWallPhoto, floorPhoto);
      if (!result.ok) {
        setSubmitError(result.error);
        setSubmitPhase("error");
        return;
      }
      storeSubmission({ result, submittedAt: new Date().toISOString() });
      setSubmitPhase("done");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "写真の処理に失敗しました。");
      setSubmitPhase("error");
    }
  }

  // Runs once, right when the 4th photo is accepted.
  useEffect(() => {
    if (finished && submitPhase === "idle") {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function goTo(i: number) {
    const target = captureSteps[i]!;
    setIndex(i);
    setPhase(photos[target.id] ? "review" : "instructions");
    setFileError(null);
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("画像ファイルを選択してください。");
      return;
    }
    setFileError(null);
    setPhotos((p) => {
      const prev = p[step.id];
      if (prev) URL.revokeObjectURL(prev);
      return { ...p, [step.id]: URL.createObjectURL(file) };
    });
    setPhase("checking");
    setTimeout(() => setPhase("review"), 900);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function retake() {
    setPhotos((p) => {
      const prev = p[step.id];
      if (prev) URL.revokeObjectURL(prev);
      const next = { ...p };
      delete next[step.id];
      return next;
    });
    setFileError(null);
    setPhase("instructions");
  }

  function accept() {
    setDone((d) => (d.includes(step.id) ? d : [...d, step.id]));
    goTo(Math.min(index + 1, captureSteps.length - 1));
  }

  function resetDemo() {
    Object.values(photos).forEach((url) => URL.revokeObjectURL(url));
    setPhotos({});
    setDone([]);
    setIndex(0);
    setPhase("instructions");
    setSubmitPhase("idle");
    setSubmitError(null);
  }

  const currentPhoto = photos[step.id];

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        {submitPhase === "submitting" && (
          <>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary">
              <span className="size-8 animate-spin rounded-full border-3 border-border border-t-primary" />
            </span>
            <h1 className="mt-6 font-display text-2xl font-semibold">写真を解析しています…</h1>
            <p className="mt-3 text-muted-foreground">
              奥の壁と床の写真から寸法の比率を計算しています。
            </p>
          </>
        )}

        {submitPhase === "error" && (
          <>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <AlertTriangle className="size-8" />
            </span>
            <h1 className="mt-6 font-display text-2xl font-semibold">確認に失敗しました</h1>
            <p className="mt-3 text-muted-foreground">{submitError}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => void submit()}>
                <RotateCcw /> 再試行
              </Button>
            </div>
          </>
        )}

        {submitPhase === "done" && (
          <>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="size-8" />
            </span>
            <h1 className="mt-6 font-display text-3xl font-semibold">すべての写真を受け付けました</h1>
            <p className="mt-3 text-muted-foreground">
              ありがとうございます。4枚の写真はすべて受け付けられました。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => router.push("/result")}>
                結果を見る
              </Button>
              <Button variant="outline" size="lg" onClick={resetDemo}>
                <RotateCcw /> デモを最初から
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button
          className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40"
          disabled={index === 0}
          onClick={() => goTo(Math.max(0, index - 1))}
        >
          <ChevronLeft className="size-4" /> 戻る
        </button>
        <span className="font-mono">
          写真 {index + 1} / {captureSteps.length}
        </span>
      </div>
      <Progress value={progress} className="mt-3" />
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>{captureGuidelines.join(" ")}</p>
      </div>

      <div className="surface-panel mt-6 overflow-hidden">
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <h1 className="font-display text-2xl font-semibold">{step.title}</h1>
          </div>
          <p className="mt-1 pl-9.5 text-muted-foreground">{step.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 pl-9.5">
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
            <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-border shadow-sm">
              <img src={step.image} alt={step.title} className="block w-full" />
            </div>
            <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground">
              {step.caption}
            </p>
            <ul className="mt-5 space-y-2">
              {step.tips.map((t) => (
                <li key={t} className="flex gap-2 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "mt-6 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                dragActive ? "border-primary bg-accent/40" : "border-border",
              )}
            >
              <UploadCloud className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                ここに写真をドラッグ&ドロップ
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                またはスマートフォンならカメラで直接撮影できます
              </p>
            </div>
            {fileError && (
              <p className="mt-2 text-center text-sm text-destructive">{fileError}</p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button size="lg" className="w-full" onClick={() => cameraInputRef.current?.click()}>
                <Camera /> カメラで撮影
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon /> ファイルを選択
              </Button>
            </div>
            {/* capture="environment" opens the phone's rear camera directly on
                mobile browsers; desktop browsers just fall back to a file picker. */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onInputChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onInputChange}
            />
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
            <div className="grid-paper overflow-hidden rounded-xl border border-border bg-secondary">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt="撮影した写真のプレビュー"
                  className="block max-h-96 w-full object-contain"
                />
              ) : (
                <div className="flex aspect-4/3 items-center justify-center">
                  <p className="text-sm text-muted-foreground">撮影した写真のプレビュー</p>
                </div>
              )}
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
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" size="lg" className="flex-1" onClick={retake}>
                <RotateCcw /> 撮り直す
              </Button>
              <Button size="lg" className="flex-1" onClick={accept}>
                この写真を使う
              </Button>
            </div>
          </div>
        )}
      </div>

      <ol
        className="mt-6 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${captureSteps.length}, minmax(0, 1fr))` }}
      >
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
