import diyRepair from "./diy-repair.json";
import kabiDiagnosis from "./kabi-diagnosis.json";

export type MonetizationRule = {
  condition: string;
  type: "affiliate" | "cpa" | "adsense";
  keyword?: string;
  cpa_url?: string;
};

export type AppConfig = {
  name: string;
  description: string;
  daily_limit: number;
  prompt: string;
  allowed_context_keys?: string[];
  monetization: MonetizationRule[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
};

const configs: Record<string, AppConfig> = {
  "diy-repair": diyRepair as AppConfig,
  "kabi-diagnosis": kabiDiagnosis as AppConfig,
};

export function getConfig(appId: string): AppConfig | null {
  return configs[appId] ?? null;
}

export function listApps(): Array<{ id: string; name: string; description: string }> {
  return Object.entries(configs).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    description: cfg.description,
  }));
}
