type MonetizationData = {
  type: "affiliate" | "cpa" | "adsense";
  amazon_url: string | null;
  rakuten_url: string | null;
  cpa_url: string | null;
};

interface Props {
  monetization: MonetizationData;
}

export default function AffiliateBlock({ monetization }: Props) {
  if (!monetization) return null;

  if (monetization.type === "affiliate") {
    return (
      <div>
        <h3>おすすめ商品を探す</h3>
        <p>
          <small>
            ※ 以下はアフィリエイトリンクです。商品を購入いただいた場合、当サイトに報酬が発生します。
          </small>
        </p>
        <div>
          {monetization.amazon_url && (
            <a href={monetization.amazon_url} target="_blank" rel="noopener noreferrer">
              Amazonで探す
            </a>
          )}
          {monetization.rakuten_url && (
            <a href={monetization.rakuten_url} target="_blank" rel="noopener noreferrer">
              楽天市場で探す
            </a>
          )}
        </div>
      </div>
    );
  }

  if (monetization.type === "cpa" && monetization.cpa_url) {
    return (
      <div>
        <h3>無料見積もり・査定はこちら</h3>
        <a href={monetization.cpa_url} target="_blank" rel="noopener noreferrer">
          無料で相談する
        </a>
      </div>
    );
  }

  return null;
}
