import { afterEach, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "@coffee-chat/core";
import {
  getAppOrigin,
  isVercelRuntime,
  resolvePgliteRuntimeConfig,
  setDbHandleForTests,
} from "@/lib/runtime";
import { GET as getHealth } from "@/app/api/health/route";

describe("Web runtime configuration (local & Vercel UI-preview)", () => {
  it("detects Vercel runtime flags safely", () => {
    expect(isVercelRuntime({ VERCEL: "1" })).toBe(true);
    expect(isVercelRuntime({ VERCEL: "true" })).toBe(true);
    expect(isVercelRuntime({ VERCEL: "0" })).toBe(false);
    expect(isVercelRuntime({ VERCEL: "false" })).toBe(false);
    expect(isVercelRuntime({})).toBe(false);
  });

  it("uses in-memory PGlite and demo seeding by default on Vercel without DATABASE_URL", () => {
    const config = resolvePgliteRuntimeConfig(
      { VERCEL: "1", NODE_ENV: "production" },
      "/var/task",
    );
    expect(config).toEqual({
      pgliteDir: ":memory:",
      shouldSeedDemo: true,
    });

    const optOut = resolvePgliteRuntimeConfig(
      {
        VERCEL: "1",
        NODE_ENV: "production",
        COFFEE_CHAT_SEED_DEMO: "false",
      },
      "/var/task",
    );
    expect(optOut).toEqual({
      pgliteDir: ":memory:",
      shouldSeedDemo: false,
    });
  });

  it("keeps local/non-Vercel mode disk-backed and unseeded unless explicitly enabled outside production", () => {
    const unseededLocal = resolvePgliteRuntimeConfig(
      { NODE_ENV: "development" },
      "/tmp/coffee-chat-web",
    );
    expect(unseededLocal).toEqual({
      pgliteDir: "/tmp/coffee-chat-web/.local/pglite",
      shouldSeedDemo: false,
    });

    const seededDev = resolvePgliteRuntimeConfig(
      {
        NODE_ENV: "development",
        COFFEE_CHAT_SEED_DEMO: "true",
      },
      "/tmp/coffee-chat-web",
    );
    expect(seededDev).toEqual({
      pgliteDir: "/tmp/coffee-chat-web/.local/pglite",
      shouldSeedDemo: true,
    });

    const prodLocal = resolvePgliteRuntimeConfig(
      {
        NODE_ENV: "production",
        COFFEE_CHAT_SEED_DEMO: "true",
      },
      "/tmp/coffee-chat-web",
    );
    expect(prodLocal.shouldSeedDemo).toBe(false);
  });

  it("resolves app origin with NEXT_PUBLIC_APP_URL > request > VERCEL_PROJECT_PRODUCTION_URL > VERCEL_URL", () => {
    expect(
      getAppOrigin(undefined, {
        NEXT_PUBLIC_APP_URL: "https://coffee.openboa.ai/",
        VERCEL_PROJECT_PRODUCTION_URL: "coffee-chat.vercel.app",
      }),
    ).toBe("https://coffee.openboa.ai");

    expect(
      getAppOrigin(undefined, {
        VERCEL_PROJECT_PRODUCTION_URL: "coffee-chat.vercel.app",
        VERCEL_URL: "coffee-chat-git-preview.vercel.app",
      }),
    ).toBe("https://coffee-chat.vercel.app");

    expect(
      getAppOrigin(undefined, {
        VERCEL_URL: "coffee-chat-git-preview.vercel.app",
      }),
    ).toBe("https://coffee-chat-git-preview.vercel.app");

    expect(
      getAppOrigin(new Request("https://custom.example.com/api/mcp"), {
        VERCEL_URL: "coffee-chat-git-preview.vercel.app",
      }),
    ).toBe("https://custom.example.com");

    expect(getAppOrigin(undefined, {})).toBe("http://localhost:3000");
  });

  describe("/api/health endpoint", () => {
    let dbHandle: DatabaseHandle | null = null;

    afterEach(async () => {
      setDbHandleForTests(null);
      if (dbHandle) {
        await dbHandle.close();
        dbHandle = null;
      }
    });

    it("reports schema readiness and Cache-Control: private, no-store without leaking secrets", async () => {
      dbHandle = await createDatabase();
      setDbHandleForTests(dbHandle);

      const res = await getHealth();
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      const body = (await res.json()) as {
        ok: boolean;
        driver: string;
        schemaReady: boolean;
      };
      expect(body.ok).toBe(true);
      expect(body.driver).toBe("pglite");
      expect(body.schemaReady).toBe(true);
    });
  });
});
