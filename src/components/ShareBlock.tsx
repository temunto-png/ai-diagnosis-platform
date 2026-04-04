import { buildShareText, buildShareUrl } from "../lib/share";
import type { DiagnosisData } from "../lib/types";

interface Props {
  appId: string;
  data: DiagnosisData;
}

export default function ShareBlock({ appId, data }: Props) {
  const pageUrl =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : `https://satsu-tei.com/${appId}/`;

  const text = buildShareText(appId, data, pageUrl);
  const shareUrl = buildShareUrl(text);

  return (
    <div className="share-block">
      <div className="share-heading">結果をシェアする</div>
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn-x"
      >
        <span className="share-btn-icon" aria-hidden="true">
          𝕏
        </span>
        Xでシェアする
      </a>
    </div>
  );
}
