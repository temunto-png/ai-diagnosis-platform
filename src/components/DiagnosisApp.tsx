import { useState } from "react";
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

export default function DiagnosisApp({ appId, context = {} }: Props) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  return (
    <div>
      <ImageUploader appId={appId} context={context} onResult={setResult} />
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
