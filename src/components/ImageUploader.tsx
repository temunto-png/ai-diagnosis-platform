import { useState, useRef, useCallback } from "react";

type DiagnosisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: Record<string, unknown> }
  | { status: "error"; message: string };

interface Props {
  appId: string;
  context?: Record<string, string>;
  onResult: (data: Record<string, unknown>) => void;
  onReset?: () => void;
  hasResult?: boolean;
}

async function resizeImage(file: File): Promise<string> {
  const MAX = 800;
  const img = await createImageBitmap(file);
  const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

async function getOrFetch(
  file: File,
  appId: string,
  context: Record<string, string>
): Promise<Record<string, unknown>> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = btoa(String.fromCharCode(...new Uint8Array(buf))).slice(0, 16);
  const cacheKey = `result:${appId}:${hash}`;

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, ts } = JSON.parse(cached) as { data: Record<string, unknown>; ts: number };
    if (Date.now() - ts < 5 * 60 * 1000) return data;
  }

  const image = await resizeImage(file);
  const res = await fetch(`/api/${appId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, context }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? "診断に失敗しました");
  }

  const data = (await res.json()) as Record<string, unknown>;
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

export default function ImageUploader({ appId, context = {}, onResult, onReset, hasResult }: Props) {
  const [state, setState] = useState<DiagnosisState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setState({ status: "loading" });
    try {
      const data = await getOrFetch(file, appId, context);
      setState({ status: "done", data });
      onResult(data);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "不明なエラーが発生しました" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appId, context]
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const isLoading = state.status === "loading";

  // 診断済み → コンパクトな「撮り直し」ボタンのみ
  if (hasResult) {
    return (
      <button
        className="rediagnose-btn"
        onClick={() => {
          setState({ status: "idle" });
          setPreview(null);
          onReset?.();
        }}
      >
        ↩ 別の写真で診断し直す
      </button>
    );
  }

  return (
    <div>
      {/* アップロードエリア */}
      <div
        className={`upload-area${isDragging ? " drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && galleryRef.current?.click()}
      >
        {isLoading && preview ? (
          <div className="preview-wrap" style={{ width: "100%", margin: 0 }}>
            <img src={preview} alt="診断中の画像" className="preview-img" />
            <div className="scan-overlay">
              <div className="scan-bar" />
              <div className="scan-label">
                🔍 AI診断中<span className="dot-anim" />
              </div>
            </div>
          </div>
        ) : preview && state.status === "done" ? (
          <img src={preview} alt="診断した画像" className="preview-img" style={{ borderRadius: "12px", width: "100%" }} />
        ) : (
          <>
            <span className="upload-icon">📷</span>
            <p className="upload-title">ここに写真をドロップ</p>
            <p className="upload-hint">またはボタンから選択 · ドラッグ&amp;ドロップも可</p>
          </>
        )}
      </div>

      {/* ボタン2つ */}
      {!isLoading && (
        <div className="upload-btns">
          <button
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
          >
            📷 カメラで撮影
          </button>
          <button
            className="btn btn-ghost"
            onClick={(e) => { e.stopPropagation(); galleryRef.current?.click(); }}
          >
            🖼️ 画像を選択
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {/* エラー */}
      {state.status === "error" && (
        <div className="error-box">
          <span>⚠️ {state.message}</span>
          <button className="error-retry" onClick={() => { setState({ status: "idle" }); setPreview(null); }}>
            もう一度試す
          </button>
        </div>
      )}
    </div>
  );
}
