import type { DiagnosisData } from "../lib/types";

interface Props {
  data: DiagnosisData;
  appId: string;
}

function severityBadge(value: string): { cls: string; label: string } {
  const normalized = value.toLowerCase();
  if (normalized.includes("low") || normalized.includes("minor") || value.includes("軽")) {
    return { cls: "badge-green", label: `軽度: ${value}` };
  }
  if (normalized.includes("medium") || normalized.includes("moderate") || value.includes("中")) {
    return { cls: "badge-yellow", label: `中度: ${value}` };
  }
  if (normalized.includes("high") || normalized.includes("severe") || value.includes("重")) {
    return { cls: "badge-red", label: `重度: ${value}` };
  }
  return { cls: "badge-gray", label: value };
}

export default function DiagnosisResult({ data }: Props) {
  if (!data || Object.keys(data).length === 0) return null;

  const products = data.products;
  const tip = data.diy_tip ?? data.prevention_tip;
  const severityValue = data.damage_level ?? data.severity;
  const badge = severityValue ? severityBadge(severityValue) : null;

  return (
    <div className="result-card">
      <div className="result-card-header">
        <span className="result-card-label">AI Diagnosis Result</span>
        <span className="result-brand">さつてい</span>
      </div>

      <div className="result-body">
        <div className="result-fields">
          {!!data.damage_type && (
            <div className="result-field">
              <div className="result-field-label">損傷タイプ</div>
              <div className="result-field-value">{data.damage_type}</div>
            </div>
          )}
          {!!data.mold_type && (
            <div className="result-field">
              <div className="result-field-label">カビの種類</div>
              <div className="result-field-value">{data.mold_type}</div>
            </div>
          )}
          {badge && (
            <div className="result-field">
              <div className="result-field-label">深刻度</div>
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
            </div>
          )}
          {!!data.color_description && (
            <div className="result-field">
              <div className="result-field-label">見た目の特徴</div>
              <div className="result-field-value" style={{ fontSize: "0.875rem" }}>
                {data.color_description}
              </div>
            </div>
          )}
          {!!data.location && (
            <div className="result-field">
              <div className="result-field-label">発生箇所</div>
              <div className="result-field-value">{data.location}</div>
            </div>
          )}
        </div>

        {tip && (
          <div className="result-tip">
            <div className="result-tip-heading">アドバイス</div>
            <p className="result-tip-text">{tip}</p>
          </div>
        )}

        {products && products.length > 0 && (
          <div>
            <div className="result-products-heading">おすすめの対策アイテム</div>
            <div className="product-items">
              {products.map((product) => (
                <div
                  key={`${product.category}:${product.priority}:${product.amazon_keyword}`}
                  className="product-item"
                >
                  <div className="product-item-name">{product.category}</div>
                  <div className="product-item-reason">{product.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
