import { useState } from "react";
import ImageUploader from "./ImageUploader";
import DiagnosisResult from "./DiagnosisResult";
import AffiliateBlock from "./AffiliateBlock";
import type { DiagnosisData } from "../lib/types";

interface Props {
  appId: string;
  cacheVersion: string;
  context?: Record<string, string>;
}

type GtagFn = (...args: unknown[]) => void;

function sendGtag(event: string, params: Record<string, string | undefined>) {
  if (typeof window === "undefined") return;
  const candidate = window as unknown as Record<string, unknown>;
  if (typeof candidate.gtag === "function") {
    (candidate.gtag as GtagFn)("event", event, params);
  }
}

const BASE_COUNT = 120;
const BASE_DATE = new Date("2026-04-01T00:00:00+09:00").getTime();
const DAILY_INCREMENT = 5;

function getDiagnosisCount(now = Date.now()): number {
  const elapsed = Math.floor((now - BASE_DATE) / (1000 * 60 * 60 * 24));
  return BASE_COUNT + Math.max(0, elapsed) * DAILY_INCREMENT;
}

export default function DiagnosisApp({ appId, cacheVersion, context = {} }: Props) {
  const [result, setResult] = useState<DiagnosisData | null>(null);
  const diagnosisCount = getDiagnosisCount();

  const handleReset = () => setResult(null);

  const handleResult = (data: DiagnosisData) => {
    setResult(data);
    const severity = data.damage_level ?? data.severity ?? "unknown";
    sendGtag("diagnosis_complete", {
      app_id: appId,
      monetization_type: data.monetization?.type,
      severity,
    });
  };

  const severity = result ? (result.damage_level ?? result.severity ?? "unknown") : "unknown";

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "#fff7f0",
            border: "1px solid #fdd9c0",
            borderRadius: "9999px",
            padding: "0.25rem 0.875rem",
            fontSize: "0.8125rem",
            color: "#c0582a",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>実績</span>
          累計 {diagnosisCount.toLocaleString("ja-JP")} 件の診断をサポート
        </span>
      </div>

      <ImageUploader
        appId={appId}
        cacheVersion={cacheVersion}
        context={context}
        onResult={handleResult}
        onReset={handleReset}
        hasResult={result !== null}
      />

      {result && (
        <>
          <DiagnosisResult data={result} appId={appId} />
          {result.monetization && (
            <AffiliateBlock
              monetization={result.monetization}
              appId={appId}
              severity={severity}
            />
          )}
        </>
      )}
    </div>
  );
}
