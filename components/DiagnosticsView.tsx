import type { DiagnosticsReport, ImageDiagnostics } from "@/lib/measure/run-diagnostics";

function Ratio({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 font-mono text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value.toFixed(3)}</span>
    </div>
  );
}

function ResultCard({
  title,
  color,
  result,
}: {
  title: string;
  color: string;
  result:
    | { ok: true; annotatedImage: string; debug: { confidence: number; notes: string | undefined } }
    | { ok: false; error: string }
    | undefined;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide uppercase" style={{ color }}>
        {title}
      </p>
      {!result ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : result.ok ? (
        <>
          <img src={result.annotatedImage} alt={title} className="w-full rounded" />
          <p className="mt-2 text-xs text-muted-foreground">
            confidence: {result.debug.confidence.toFixed(2)}
            {result.debug.notes ? ` — ${result.debug.notes}` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-destructive">{result.error}</p>
      )}
    </div>
  );
}

function ImageCard({ img }: { img: ImageDiagnostics }) {
  if (img.error) {
    return (
      <div className="rounded-xl border border-destructive/40 p-5">
        <h3 className="font-mono text-base font-semibold">{img.filename}</h3>
        <p className="mt-2 text-sm text-destructive">{img.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <h3 className="font-mono text-base font-semibold">{img.filename}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ResultCard title="壁写真として解析した場合" color="#16a34a" result={img.wallResult} />
        <ResultCard title="床写真として解析した場合" color="#d97706" result={img.floorResult} />
      </div>
    </div>
  );
}

export function DiagnosticsView({ report }: { report: DiagnosticsReport }) {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <header>
        <h1 className="font-display text-2xl font-semibold">検出診断（Photo02）</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photo02/ 内の実写真に対する現在の検出ロジック（OpenAI
          Vision）の出力をそのまま表示しています。
        </p>
      </header>

      <section>
        <h2 className="font-display text-lg font-semibold">セット別の最終レート</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {report.sets.map((s) => (
            <div
              key={`${s.set}-${s.wallFile}-${s.floorFile}`}
              className="rounded-lg border border-border p-4"
            >
              <p className="font-mono text-xs text-muted-foreground">
                {s.set} — {s.wallFile} + {s.floorFile}
              </p>
              {s.ok && s.ratios ? (
                <div className="mt-2 space-y-1">
                  <Ratio label="幅÷便器幅" value={s.ratios.widthOverToilet} />
                  <Ratio label="高さ÷幅" value={s.ratios.heightOverWidth} />
                  <Ratio label="奥行÷幅" value={s.ratios.lengthOverWidth} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-destructive">{s.error}</p>
              )}
            </div>
          ))}
          {report.sets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              既知のセットに一致する画像が見つかりませんでした。
            </p>
          )}
        </div>
      </section>

      <section className="space-y-10">
        <h2 className="font-display text-lg font-semibold">画像ごとの検出詳細</h2>
        {report.images.map((img) => (
          <ImageCard key={img.filename} img={img} />
        ))}
      </section>
    </div>
  );
}
