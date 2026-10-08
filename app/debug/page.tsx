import type { Metadata } from "next";

import { DiagnosticsView } from "@/components/DiagnosticsView";
import { runPhotoDiagnostics } from "@/lib/measure/run-diagnostics";

// Internal tool: runs the measurement pipeline against every photo in
// Photo02/ and shows detected objects, lines, and the resulting rates —
// used to validate detection quality against real photos. Not linked from
// the public UI; visit /debug directly.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "検出診断 — CAMESUKE",
};

export default async function DebugPage() {
  const report = await runPhotoDiagnostics();
  return <DiagnosticsView report={report} />;
}
