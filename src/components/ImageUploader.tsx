import { useState, useRef } from "react";

type DiagnosisState =
  | { status: "idle" }
  | { status: "resizing" }
  | { status: "loading" }
  | { status: "done"; data: Record<string, unknown> }
  | { status: "error"; message: string };

interface Props {
  appId: string;
  context?: Record<string, string>;
  onResult: (data: Record<string, unknown>) => void;
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
    const err = await res.json() as { error: string };
    throw new Error(err.error ?? "診断に失敗しました");
  }

  const data = await res.json() as Record<string, unknown>;
  sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

export default function ImageUploader({ appId, context = {}, onResult }: Props) {
  const [state, setState] = useState<DiagnosisState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setState({ status: "resizing" });
    try {
      setState({ status: "loading" });
      const data = await getOrFetch(file, appId, context);
      setState({ status: "done", data });
      onResult(data);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "不明なエラー" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      {preview && <img src={preview} alt="選択した画像" style={{ maxWidth: "300px" }} />}

      <button onClick={() => inputRef.current?.click()} disabled={state.status === "loading"}>
        {state.status === "loading" || state.status === "resizing"
          ? "診断中..."
          : "画像を選択して診断"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {state.status === "error" && (
        <p style={{ color: "red" }}>エラー: {state.message}</p>
      )}
    </div>
  );
}
