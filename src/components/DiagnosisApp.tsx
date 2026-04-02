import { useState, useMemo } from "react";
import ImageUploader from "./ImageUploader";
import DiagnosisResult from "./DiagnosisResult";
import AffiliateBlock from "./AffiliateBlock";

type Monetization = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

interface Props {
  appId: string;
  context?: Record<string, string>;
}

const BASE_COUNT = 120;
const BASE_DATE = new Date("2026-04-01").getTime();
const DAILY_INCREMENT = 5;

function useDiagnosisCount(): number {
  return useMemo(() => {
    const elapsed = Math.floor((Date.now() - BASE_DATE) / (1000 * 60 * 60 * 24));
    return BASE_COUNT + Math.max(0, elapsed) * DAILY_INCREMENT;
  }, []);
}

export default function DiagnosisApp({ appId, context = {} }: Props) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const diagnosisCount = useDiagnosisCount();

  const handleReset = () => setResult(null);

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <span style={{
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
        }}>
          <span style={{ fontSize: "0.9rem" }}>📊</span>
          累計 {diagnosisCount.toLocaleString("ja-JP")} 人が診断済み
        </span>
      </div>
      <ImageUploader
        appId={appId}
        context={context}
        onResult={setResult}
        onReset={handleReset}
        hasResult={result !== null}
      />
      {result && (
        <>
          <DiagnosisResult data={result} appId={appId} />
          {result.monetization && (
            <AffiliateBlock monetization={result.monetization as Monetization} />
          )}
        </>
      )}
    </div>
  );
}
