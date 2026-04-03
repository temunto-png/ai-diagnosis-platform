import { useState, useRef, useEffect } from "react";
import type { DiagnosisData } from "../lib/types";
import { buildClientCacheKey } from "../lib/diagnosis-service";

const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_FILE_SIZE = 8 * 1024 * 1024;

type DiagnosisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: DiagnosisData }
  | { status: "error"; message: string };

interface Props {
  appId: string;
  context?: Record<string, string>;
  onResult: (data: DiagnosisData) => void;
  onReset?: () => void;
  hasResult?: boolean;
}

export function validateUploadFile(file: File): void {
  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    throw new Error("JPEG/PNG/WebP形式の画像を選択してください");
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    throw new Error("画像サイズが大きすぎます。8MB以下の画像を選択してください");
  }
}

async function resizeImage(file: File): Promise<string> {
  validateUploadFile(file);

  const MAX = 800;
  const img = await createImageBitmap(file);
  try {
    const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally {
    img.close();
  }
}

async function hashFile(file: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getOrFetch(
  file: File,
  appId: string,
  context: Record<string, string>
): Promise<DiagnosisData> {
  const imageHash = await hashFile(file);
  const image = await resizeImage(file);
  const cacheKey = buildClientCacheKey(appId, imageHash, context);

  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached) as { data: DiagnosisData; ts: number };
      if (Date.now() - ts < 5 * 60 * 1000) return data;
    } catch {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const res = await fetch(`/api/${appId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, imageHash, context }),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error ?? "險ｺ譁ｭ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
    }
    throw new Error(`險ｺ譁ｭ繧ｵ繝ｼ繝薙せ縺ｫ謗･邯壹〒縺阪∪縺帙ｓ縺ｧ縺励◆ (${res.status})`);
  }

  const data = (await res.json()) as DiagnosisData;
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

export default function ImageUploader({ appId, context = {}, onResult, onReset, hasResult }: Props) {
  const [state, setState] = useState<DiagnosisState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setState({ status: "loading" });
    try {
      setPreview((currentPreview) => {
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        return URL.createObjectURL(file);
      });
      const data = await getOrFetch(file, appId, context);
      setState({ status: "done", data });
      onResult(data);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) void handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const isLoading = state.status === "loading";

  if (hasResult) {
    return (
      <button
        className="rediagnose-btn"
        onClick={() => {
          setState({ status: "idle" });
          setPreview((currentPreview) => {
            if (currentPreview) URL.revokeObjectURL(currentPreview);
            return null;
          });
          onReset?.();
        }}
      >
        竊ｩ 蛻･縺ｮ蜀咏悄縺ｧ險ｺ譁ｭ縺礼峩縺・
      </button>
    );
  }

  return (
    <div>
      <div
        className={`upload-area${isDragging ? " drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && galleryRef.current?.click()}
      >
        {isLoading && preview ? (
          <div className="preview-wrap" style={{ width: "100%", margin: 0 }}>
            <img src={preview} alt="險ｺ譁ｭ荳ｭ縺ｮ逕ｻ蜒・" className="preview-img" />
            <div className="scan-overlay">
              <div className="scan-bar" />
              <div className="scan-label">
                剥 AI險ｺ譁ｭ荳ｭ<span className="dot-anim" />
              </div>
            </div>
          </div>
        ) : preview && state.status === "done" ? (
          <img
            src={preview}
            alt="險ｺ譁ｭ縺励◆逕ｻ蜒・"
            className="preview-img"
            style={{ borderRadius: "12px", width: "100%" }}
          />
        ) : (
          <>
            <span className="upload-icon">胴</span>
            <p className="upload-title">縺薙％縺ｫ蜀咏悄繧偵ラ繝ｭ繝・・</p>
            <p className="upload-hint">縺ｾ縺溘・繝懊ち繝ｳ縺九ｉ驕ｸ謚・ﾂｷ 繝峨Λ繝・げ&amp;繝峨Ο繝・・繧ょ庄</p>
          </>
        )}
      </div>

      {!isLoading && (
        <div className="upload-btns">
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              cameraRef.current?.click();
            }}
          >
            胴 繧ｫ繝｡繝ｩ縺ｧ謦ｮ蠖ｱ
          </button>
          <button
            className="btn btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              galleryRef.current?.click();
            }}
          >
            名・・逕ｻ蜒上ｒ驕ｸ謚・
          </button>
        </div>
      )}

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

      {state.status === "error" && (
        <div className="error-box">
          <span>笞・・{state.message}</span>
          <button
            className="error-retry"
            onClick={() => {
              setState({ status: "idle" });
              setPreview((currentPreview) => {
                if (currentPreview) URL.revokeObjectURL(currentPreview);
                return null;
              });
            }}
          >
            繧ゅ≧荳蠎ｦ隧ｦ縺・
          </button>
        </div>
      )}
    </div>
  );
}
