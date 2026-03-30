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

export default function DiagnosisResult({ data, appId }: Props) {
  if (!data || Object.keys(data).length === 0) return null;

  const products = data.products as ProductItem[] | undefined;
  const tip = (data.diy_tip ?? data.prevention_tip) as string | undefined;

  return (
    <div>
      <h2>診断結果</h2>

      {!!data.damage_type && <p>損傷タイプ: <strong>{String(data.damage_type)}</strong></p>}
      {!!data.damage_level && <p>程度: <strong>{String(data.damage_level)}</strong></p>}
      {!!data.mold_type && <p>カビの種類: <strong>{String(data.mold_type)}</strong></p>}
      {!!data.severity && <p>深刻度: <strong>{String(data.severity)}</strong></p>}
      {!!data.color_description && <p>色の特徴: {String(data.color_description)}</p>}

      {tip && (
        <div>
          <h3>アドバイス</h3>
          <p>{tip}</p>
        </div>
      )}

      {products && products.length > 0 && (
        <div>
          <h3>おすすめ商品</h3>
          <ul>
            {products.map((p, i) => (
              <li key={i}>
                <strong>{p.category}</strong>: {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
