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
        <div style={{
          background: "linear-gradient(135deg, #fff4f0, #fff8f4)",
          border: "1.5px solid var(--primary-mid)",
          borderRadius: "var(--radius)",
          padding: "0.75rem 1.125rem",
          marginBottom: "1rem",
          fontSize: "0.875rem",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
        }}>
          <span style={{fontSize: "1.1rem"}}>💡</span>
          <span>診断結果をもとに、<strong style={{color:"var(--text)"}}>今すぐ対処できる</strong>アイテムをご提案しています。</span>
        </div>
        <div className="affiliate-heading">関連アイテムをチェック</div>
        <div className="affiliate-sub">
          診断結果に近い対策アイテムを、主要なショッピングサイトで確認できます。
        </div>
        <div className="affiliate-btns" style={{gridTemplateColumns: "1fr"}}>
          {monetization.amazon_url && (
            <a
              href={monetization.amazon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="affiliate-btn affiliate-btn-amazon"
              style={{fontSize: "1rem", padding: "1.125rem 1.5rem", justifyContent: "center"}}
              onClick={() =>
                sendAffiliateClick({
                  appId,
                  destination: "amazon",
                  monetizationType: monetization.type,
                  severity,
                })
              }
            >
              <span className="affiliate-btn-icon">A</span>
              <span>
                <span className="affiliate-btn-label">最短で確認</span>
                ⭐ Amazonで今すぐ確認する
              </span>
            </a>
          )}
          {monetization.rakuten_url && (
            <a
              href={monetization.rakuten_url}
              target="_blank"
              rel="noopener noreferrer"
              className="affiliate-btn affiliate-btn-rakuten"
              style={{fontSize: "0.875rem", opacity: 0.85}}
              onClick={() =>
                sendAffiliateClick({
                  appId,
                  destination: "rakuten",
                  monetizationType: monetization.type,
                  severity,
                })
              }
            >
              <span className="affiliate-btn-icon">R</span>
              <span>
                <span className="affiliate-btn-label">比較しながら確認</span>
                楽天市場で見る
              </span>
            </a>
          )}
        </div>
        <p style={{fontSize:"0.75rem", color:"var(--text-dim)", textAlign:"center", margin:"0.5rem 0 0"}}>
          ※ リンク先での購入は任意です。診断結果は購入の有無に関わらず提供されます。
        </p>
        <p className="affiliate-disclosure">
          本サイトではアフィリエイトリンクを利用する場合があります。掲載内容は調査時点の情報であり、購入前に各販売ページをご確認ください。
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
            onClick={() =>
              sendAffiliateClick({
                appId,
                destination: "cpa",
                monetizationType: monetization.type,
                severity,
              })
            }
          >
            専門サービスを見る
          </a>
        </div>
      </div>
    );
  }

  return null;
}
