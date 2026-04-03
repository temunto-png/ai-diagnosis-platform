import type { MonetizationResult } from "../lib/types";

interface Props {
  monetization: MonetizationResult;
  appId: string;
  severity: string;
}

type GtagFn = (...args: unknown[]) => void;

function sendAffiliateClick(params: {
  appId: string;
  destination: "amazon" | "rakuten" | "cpa";
  monetizationType: string;
  severity: string;
}) {
  if (typeof window === "undefined") return;
  const candidate = window as unknown as Record<string, unknown>;
  if (typeof candidate.gtag === "function") {
    (candidate.gtag as GtagFn)("event", "affiliate_click", {
      app_id: params.appId,
      destination: params.destination,
      monetization_type: params.monetizationType,
      severity: params.severity,
    });
  }
}

export default function AffiliateBlock({ monetization, appId, severity }: Props) {
  if (!monetization) return null;

  if (monetization.type === "affiliate") {
    return (
      <div className="affiliate-block">
        <div className="affiliate-heading">関連アイテムをチェック</div>
        <div className="affiliate-sub">
          診断結果に近い対策アイテムを、主要なショッピングサイトで確認できます。
        </div>
        <div className="affiliate-btns">
          {monetization.amazon_url && (
            <a
              href={monetization.amazon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="affiliate-btn affiliate-btn-amazon"
              onClick={() => sendAffiliateClick({ appId, destination: "amazon", monetizationType: monetization.type, severity })}
            >
              <span className="affiliate-btn-icon">🛒</span>
              <span>
                <span className="affiliate-btn-label">最短で探す</span>
                Amazon で見る
              </span>
            </a>
          )}
          {monetization.rakuten_url && (
            <a
              href={monetization.rakuten_url}
              target="_blank"
              rel="noopener noreferrer"
              className="affiliate-btn affiliate-btn-rakuten"
              onClick={() => sendAffiliateClick({ appId, destination: "rakuten", monetizationType: monetization.type, severity })}
            >
              <span className="affiliate-btn-icon">🧺</span>
              <span>
                <span className="affiliate-btn-label">比較しながら探す</span>
                楽天市場で見る
              </span>
            </a>
          )}
        </div>
        <p className="affiliate-disclosure">
          当サイトはアフィリエイトリンクを利用しています。購入や申込が発生した場合、運営者に報酬が支払われることがあります。
        </p>
      </div>
    );
  }

  if (monetization.type === "cpa" && monetization.cpa_url) {
    return (
      <div className="affiliate-block">
        <div className="affiliate-heading">プロに相談する</div>
        <div className="affiliate-sub">
          自力での対処が難しい場合は、専門サービスへの相談も検討してください。
        </div>
        <div className="affiliate-btns">
          <a
            href={monetization.cpa_url}
            target="_blank"
            rel="noopener noreferrer"
            className="affiliate-btn affiliate-btn-cpa"
            onClick={() => sendAffiliateClick({ appId, destination: "cpa", monetizationType: monetization.type, severity })}
          >
            専門サービスを見る
          </a>
        </div>
      </div>
    );
  }

  return null;
}
