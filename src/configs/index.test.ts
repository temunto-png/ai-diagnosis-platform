import { describe, it, expect } from "vitest";
import { getConfig, listApps } from "./index";

describe("getConfig", () => {
  it("returns config for known appId", () => {
    const config = getConfig("diy-repair");
    expect(config).not.toBeNull();
    expect(config?.name).toBe("DIY補修診断");
    expect(config?.prompt).toContain("DIY補修");
    expect(config?.daily_limit).toBeGreaterThan(0);
  });

  it("returns null for unknown appId", () => {
    expect(getConfig("unknown-app")).toBeNull();
  });
});

describe("listApps", () => {
  it("returns array with at least 2 apps", () => {
    const apps = listApps();
    expect(apps.length).toBeGreaterThanOrEqual(2);
  });

  it("each app has id and name", () => {
    listApps().forEach((app) => {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
    });
  });
});
