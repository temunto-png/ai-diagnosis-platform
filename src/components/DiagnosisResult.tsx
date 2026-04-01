interface Props {
  data: Record<string, unknown>;
  appId: string;
}

type ProductItem = {
  category: string;
  amazon_keyword: string;
  reason: string;
  priority: number;
};

function severityBadge(value: string): { cls: string; label: string } {
  const v = value.toLowerCase();
  if (v.includes("軽") || v.includes("low") || v.includes("minor"))
    return { cls: "badge-green", label: `✅ ${value}` };
  if (v.includes("中") || v.includes("medium") || v.includes("moderate"))
    return { cls: "badge-yellow", label: `⚠️ ${value}` };
  if (v.includes("重") || v.includes("深") || v.includes("high") || v.includes("severe"))
    return { cls: "badge-red", label: `🚨 ${value}` };
  return { cls: "badge-gray", label: value };
}

export default function DiagnosisResult({ data }: Props) {
  if (!data || Object.keys(data).length === 0) return null;

  const products = data.products as ProductItem[] | undefined;
  const tip = (data.diy_tip ?? data.prevention_tip) as string | undefined;

  const severityValue = (data.damage_level ?? data.severity) as string | undefined;
  const badge = severityValue ? severityBadge(String(severityValue)) : null;

  return (
    <div className="result-card">
      {/* ヘッダー */}
      <div className="result-card-header">
        <span className="result-card-label">🔍 AI診断レポート</span>
        <span className="result-brand">撮偵</span>
      </div>

      <div className="result-body">

        {/* 診断フィールド */}
        <div className="result-fields">
          {data.damage_type && (
            <div className="result-field">
              <div className="result-field-label">損傷タイプ</div>
              <div className="result-field-value">{String(data.damage_type)}</div>
            </div>
          )}
          {data.mold_type && (
            <div className="result-field">
              <div className="result-field-label">カビの種類</div>
              <div className="result-field-value">{String(data.mold_type)}</div>
            </div>
          )}
          {badge && (
            <div className="result-field">
              <div className="result-field-label">深刻度</div>
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
            </div>
          )}
          {data.color_description && (
            <div className="result-field">
              <div className="result-field-label">色の特徴</div>
              <div className="result-field-value" style={{ fontSize: "0.875rem" }}>
                {String(data.color_description)}
              </div>
            </div>
          )}
        </div>

        {/* アドバイス */}
        {tip && (
          <div className="result-tip">
            <div className="result-tip-heading">💡 アドバイス</div>
            <p className="result-tip-text">{tip}</p>
          </div>
        )}

        {/* おすすめ商品カテゴリ */}
        {products && products.length > 0 && (
          <div>
            <div className="result-products-heading">🛒 おすすめ商品カテゴリ</div>
            <div className="product-items">
              {products.map((p, i) => (
                <div key={i} className="product-item">
                  <div className="product-item-name">{p.category}</div>
                  <div className="product-item-reason">{p.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
