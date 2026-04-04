import { useEffect, useRef, useState } from "react";
import { normalizeDiagnosisData, type DiagnosisData } from "../lib/types";
import { buildClientCacheKey } from "../lib/diagnosis-service";

const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_FILE_SIZE = 8 * 1024 * 1024;
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const CLIENT_REQUEST_TIMEOUT_MS = 45 * 1000;

type DiagnosisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: DiagnosisData }
  | { status: "error"; message: string };

export type UploadDependencies = {
  fetchImpl: typeof fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  hashBase64: (value: string) => Promise<string>;
  resizeImage: (file: File) => Promise<string>;
  requestTimeoutMs?: number;
};

interface Props {
  appId: string;
  cacheVersion: string;
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

export async function hashBase64(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getDefaultUploadDependencies(): UploadDependencies {
  return {
    fetchImpl: globalThis.fetch.bind(globalThis),
    storage: sessionStorage,
    hashBase64,
    resizeImage,
  };
}

function createTimedAbortSignal(
  upstreamSignal?: AbortSignal,
  timeoutMs = CLIENT_REQUEST_TIMEOUT_MS
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
    },
  };
}

function mapDiagnosisErrorMessage(status: number, message?: string, requestId?: string): string {
  if (status === 429) {
    return "診断回数の上限に達しました。時間をおいてから再度お試しください。";
  }

  if (status === 503) {
    return requestId
      ? `診断サービスが混み合っています。しばらくしてから再度お試しください。（問い合わせID: ${requestId}）`
      : "診断サービスが混み合っています。しばらくしてから再度お試しください。";
  }

  return message ?? `診断に失敗しました。サーバーエラー (${status})`;
}

export async function getOrFetchDiagnosis(
  file: File,
  appId: string,
  cacheVersion: string,
  context: Record<string, string>,
  deps: UploadDependencies = getDefaultUploadDependencies(),
  signal?: AbortSignal
): Promise<DiagnosisData> {
  const image = await deps.resizeImage(file);
  const imageHash = await deps.hashBase64(image);
  const cacheKey = buildClientCacheKey(appId, imageHash, context, cacheVersion);

  const cached = deps.storage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached) as { data: DiagnosisData; ts: number };
      if (Date.now() - ts < CLIENT_CACHE_TTL_MS) return data;
    } catch {
      deps.storage.removeItem(cacheKey);
    }
  }

  const { signal: requestSignal, cleanup } = createTimedAbortSignal(signal, deps.requestTimeoutMs);
  let response: Response;
  try {
    response = await deps.fetchImpl(`/api/${appId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, imageHash, context }),
      signal: requestSignal,
    });
  } catch (error) {
    cleanup();
    if (error instanceof Error && error.name === "AbortError") {
      if (signal?.aborted) throw error;
      throw new Error("診断がタイムアウトしました。通信環境を確認して、もう一度お試しください。");
    }
    if (error instanceof TypeError) {
      throw new Error("診断リクエストの送信に失敗しました。ページを再読み込みして、もう一度お試しください。");
    }
    throw error;
  }
  cleanup();

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const error = (await response.json()) as { error?: string; requestId?: string };
      throw new Error(mapDiagnosisErrorMessage(response.status, error.error, error.requestId));
    }

    throw new Error(mapDiagnosisErrorMessage(response.status));
  }

  const data = normalizeDiagnosisData(await response.json());
  deps.storage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

export default function ImageUploader({
  appId,
  cacheVersion,
  context = {},
  onResult,
  onReset,
  hasResult,
}: Props) {
  const [state, setState] = useState<DiagnosisState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = async (file: File) => {
    const requestSequence = ++requestSequenceRef.current;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setState({ status: "loading" });

    try {
      setPreview((currentPreview) => {
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        return URL.createObjectURL(file);
      });

      const data = await getOrFetchDiagnosis(
        file,
        appId,
        cacheVersion,
        context,
        undefined,
        abortController.signal
      );
      if (requestSequence !== requestSequenceRef.current) return;

      setState({ status: "done", data });
      onResult(data);
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;

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
          abortControllerRef.current?.abort();
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
            <span className="upload-icon">画像</span>
            <p className="upload-title">画像をアップロードして診断を始める</p>
            <p className="upload-hint">
              ドラッグ&ドロップ、またはボタンから画像を選択してください
            </p>
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
            画像を選ぶ
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
              abortControllerRef.current?.abort();
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
