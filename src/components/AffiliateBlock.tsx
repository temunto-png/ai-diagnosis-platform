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
  const w = window as unknown as Record<string, unknown>;
  if (typeof w["gtag"] === "function") {
    (w["gtag"] as GtagFn)("event", "affiliate_click", {
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
        <div className="affiliate-heading">🛒 おすすめ商品を探す</div>
        <div className="affiliate-sub">
          診断結果に合った商品をAmazon・楽天市場で検索できます
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
              <span className="affiliate-btn-icon">📦</span>
              <span>
                <span className="affiliate-btn-label">最短翌日お届け</span>
                Amazonで探す
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
              <span className="affiliate-btn-icon">🛍️</span>
              <span>
                <span className="affiliate-btn-label">ポイント還元あり</span>
                楽天市場で探す
              </span>
            </a>
          )}
        </div>
        <p className="affiliate-disclosure">
          ※ アフィリエイトリンクです。購入時に当サイトへ報酬が発生する場合があります。
        </p>
      </div>
    );
  }

  if (monetization.type === "cpa" && monetization.cpa_url) {
    return (
      <div className="affiliate-block">
        <div className="affiliate-heading">🏠 プロに相談する</div>
        <div className="affiliate-sub">
          自分での修繕が難しい場合は、専門業者への無料相談がおすすめです
        </div>
        <div className="affiliate-btns">
          <a
            href={monetization.cpa_url}
            target="_blank"
            rel="noopener noreferrer"
            className="affiliate-btn affiliate-btn-cpa"
            onClick={() => sendAffiliateClick({ appId, destination: "cpa", monetizationType: monetization.type, severity })}
          >
            <span className="affiliate-btn-icon">📋</span>
            無料で見積もり・相談する
          </a>
        </div>
      </div>
    );
  }

  return null;
}
