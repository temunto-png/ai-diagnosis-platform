import { useEffect, useRef, useState } from "react";
import type { DiagnosisData } from "../lib/types";
import { buildClientCacheKey } from "../lib/diagnosis-service";

const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_FILE_SIZE = 8 * 1024 * 1024;
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

type DiagnosisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: DiagnosisData }
  | { status: "error"; message: string };

export type UploadDependencies = {
  fetchImpl: typeof fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  hashFile: (file: File) => Promise<string>;
  resizeImage: (file: File) => Promise<string>;
};

interface Props {
  appId: string;
  context?: Record<string, string>;
  onResult: (data: DiagnosisData) => void;
  onReset?: () => void;
  hasResult?: boolean;
}

export function validateUploadFile(file: File): void {
  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    throw new Error("JPEG / PNG / WebP 形式の画像を選択してください。");
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    throw new Error("画像サイズが大きすぎます。8MB 以下の画像を選択してください。");
  }
}

export async function resizeImage(file: File): Promise<string> {
  validateUploadFile(file);

  const maxLength = 800;
  const imageBitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(maxLength / imageBitmap.width, maxLength / imageBitmap.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imageBitmap.width * ratio);
    canvas.height = Math.round(imageBitmap.height * ratio);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");

    context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
  } finally {
    imageBitmap.close();
  }
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getDefaultUploadDependencies(): UploadDependencies {
  return {
    fetchImpl: fetch,
    storage: sessionStorage,
    hashFile,
    resizeImage,
  };
}

export async function getOrFetchDiagnosis(
  file: File,
  appId: string,
  context: Record<string, string>,
  deps: UploadDependencies = getDefaultUploadDependencies()
): Promise<DiagnosisData> {
  const imageHash = await deps.hashFile(file);
  const image = await deps.resizeImage(file);
  const cacheKey = buildClientCacheKey(appId, imageHash, context);

  const cached = deps.storage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached) as { data: DiagnosisData; ts: number };
      if (Date.now() - ts < CLIENT_CACHE_TTL_MS) return data;
    } catch {
      deps.storage.removeItem(cacheKey);
    }
  }

  const response = await deps.fetchImpl(`/api/${appId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, imageHash, context }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const error = (await response.json()) as { error?: string };
      throw new Error(error.error ?? "診断に失敗しました。しばらくしてから再度お試しください。");
    }

    throw new Error(`診断に失敗しました。サーバーエラー (${response.status})`);
  }

  const data = (await response.json()) as DiagnosisData;
  deps.storage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

export default function ImageUploader({ appId, context = {}, onResult, onReset, hasResult }: Props) {
  const [state, setState] = useState<DiagnosisState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const requestSequenceRef = useRef(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = async (file: File) => {
    const requestSequence = ++requestSequenceRef.current;
    setState({ status: "loading" });

    try {
      setPreview((currentPreview) => {
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        return URL.createObjectURL(file);
      });

      const data = await getOrFetchDiagnosis(file, appId, context);
      if (requestSequence !== requestSequenceRef.current) return;

      setState({ status: "done", data });
      onResult(data);
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return;

      setState({
        status: "error",
        message: error instanceof Error ? error.message : "画像のアップロードに失敗しました。",
      });
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) void handleFile(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);
  const isLoading = state.status === "loading";

  if (hasResult) {
    return (
      <button
        className="rediagnose-btn"
        onClick={() => {
          requestSequenceRef.current += 1;
          setState({ status: "idle" });
          setPreview((currentPreview) => {
            if (currentPreview) URL.revokeObjectURL(currentPreview);
            return null;
          });
          onReset?.();
        }}
      >
        別の画像で再診断する
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
            <img src={preview} alt="診断中の画像プレビュー" className="preview-img" />
            <div className="scan-overlay">
              <div className="scan-bar" />
              <div className="scan-label">
                AI が画像を解析中<span className="dot-anim" />
              </div>
            </div>
          </div>
        ) : preview && state.status === "done" ? (
          <img
            src={preview}
            alt="診断済み画像のプレビュー"
            className="preview-img"
            style={{ borderRadius: "12px", width: "100%" }}
          />
        ) : (
          <>
            <span className="upload-icon">📷</span>
            <p className="upload-title">写真をアップロードして診断を開始</p>
            <p className="upload-hint">ドラッグ&ドロップ、またはタップして画像を選択してください</p>
          </>
        )}
      </div>

      {!isLoading && (
        <div className="upload-btns">
          <button
            className="btn btn-primary"
            onClick={(event) => {
              event.stopPropagation();
              cameraRef.current?.click();
            }}
          >
            カメラで撮影
          </button>
          <button
            className="btn btn-ghost"
            onClick={(event) => {
              event.stopPropagation();
              galleryRef.current?.click();
            }}
          >
            写真を選択
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
          <span>エラー: {state.message}</span>
          <button
            className="error-retry"
            onClick={() => {
              requestSequenceRef.current += 1;
              setState({ status: "idle" });
              setPreview((currentPreview) => {
                if (currentPreview) URL.revokeObjectURL(currentPreview);
                return null;
              });
            }}
          >
            やり直す
          </button>
        </div>
      )}
    </div>
  );
}
