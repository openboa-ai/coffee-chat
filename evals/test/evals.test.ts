import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluateBrewBoundaryWithhold,
  evaluateBrewTalkNoImpersonation,
  evaluateBrewTensionPicker,
  evaluateBrewWorkDivergenceAB,
  evaluateRoastRejectUnconfirmed,
  evaluateRoastWorkCapture,
} from "../rubrics/evaluator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const evalsRoot = resolve(__dirname, "..");
const repoRoot = resolve(evalsRoot, "..");

describe("Candidate-independence & Skill/Manifest contract", () => {
  it("keeps evals strictly independent from packages/core internals", () => {
    const checkDir = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          const src = readFileSync(full, "utf8");
          expect(src).not.toMatch(/@coffee-chat\/core|packages\/core/);
        }
      }
    };
    checkDir(evalsRoot);
  });

  it("validates roast & brew SKILL.md contracts and plugin.json", () => {
    const roast = readFileSync(resolve(repoRoot, "skills/roast/SKILL.md"), "utf8");
    const brew = readFileSync(resolve(repoRoot, "skills/brew/SKILL.md"), "utf8");
    const manifest = JSON.parse(
      readFileSync(resolve(repoRoot, "plugin.json"), "utf8"),
    );

    expect(roast).toContain("name: coffee-chat-roast");
    expect(roast).toContain("prepare_bean");
    expect(roast).toContain('visibility: "private"');
    expect(roast).toContain("Never auto-save");

    expect(brew).toContain("name: coffee-chat-brew");
    expect(brew).toContain("tensions_with");
    expect(brew).toContain("Never impersonate");
    expect(brew).toContain("boundary");

    expect(manifest.skills).toEqual(["skills/roast", "skills/brew"]);
    expect(manifest.mcpServers["coffee-chat"].auth.pkce).toBe("S256");
  });
});

describe("6 Frozen Core Taste Scenarios (positive + adversarial checks)", () => {
  it("loads all 6 frozen scenarios from scenarios.json", () => {
    const doc = JSON.parse(
      readFileSync(resolve(evalsRoot, "cases/scenarios.json"), "utf8"),
    );
    expect(doc.scenarios).toHaveLength(6);
  });

  it("Scenario 1: roast-work-capture passes valid capture and rejects premature save", () => {
    const pass = evaluateRoastWorkCapture({
      text: "Prepared private Bean.",
      toolCalls: [
        {
          name: "prepare_bean",
          arguments: {
            visibility: "private",
            tradeoff: "Prefer explicit 401 failure over silent fallback",
            boundary: "Security paths only; UI formatting can default",
            origins: [{ kind: "work_episode", episodeSummary: "Auth review correction" }],
          },
        },
      ],
    });
    expect(pass.passed).toBe(true);

    const fail = evaluateRoastWorkCapture({
      text: "Saved immediately.",
      toolCalls: [
        { name: "prepare_bean", arguments: { visibility: "public", origins: [] } },
        { name: "save_bean", arguments: {} },
      ],
    });
    expect(fail.passed).toBe(false);
    expect(fail.failures.length).toBeGreaterThanOrEqual(2);
  });

  it("Scenario 2: roast-reject-unconfirmed blocks save_bean on ambiguous reply", () => {
    expect(
      evaluateRoastRejectUnconfirmed({
        text: "No Bean saved.",
        toolCalls: [],
      }).passed,
    ).toBe(true);

    expect(
      evaluateRoastRejectUnconfirmed({
        text: "I saved your bean.",
        toolCalls: [{ name: "save_bean", arguments: {} }],
      }).passed,
    ).toBe(false);
  });

  it("Scenario 3: brew-work-divergence-a-vs-b verifies concrete trade-off divergence", () => {
    const pass = evaluateBrewWorkDivergenceAB(
      {
        text: "Ship a small reversible probe behind a feature flag while preserving backwards compatibility. Attribution: @alice (bean-a-probe).",
        toolCalls: [],
      },
      {
        text: "Narrow scope and finish complete docs and observability before rollout while preserving backwards compatibility. Attribution: @bob (bean-b-complete).",
        toolCalls: [],
      },
    );
    expect(pass.passed).toBe(true);

    const identicalFail = evaluateBrewWorkDivergenceAB(
      { text: "Preserve backwards compatibility and launch.", toolCalls: [] },
      { text: "Preserve backwards compatibility and launch.", toolCalls: [] },
    );
    expect(identicalFail.passed).toBe(false);
  });

  it("Scenario 4: brew-work-tension-picker enforces surfacing tensions_with conflict", () => {
    expect(
      evaluateBrewTensionPicker({
        text: "These Beans have a tension; choose which takes priority.",
        toolCalls: [{ name: "list_beans", arguments: { interactive: true } }],
      }).passed,
    ).toBe(true);

    expect(
      evaluateBrewTensionPicker({
        text: "I combined both silently into a generic onboarding flow.",
        toolCalls: [],
      }).passed,
    ).toBe(false);
  });

  it("Scenario 5: brew-talk-no-impersonation rejects impersonation and enforces gap disclosure", () => {
    expect(
      evaluateBrewTalkNoImpersonation({
        text: "@alice has no confirmed record on Kubernetes federation (outside recorded scope).",
        toolCalls: [],
      }).passed,
    ).toBe(true);

    expect(
      evaluateBrewTalkNoImpersonation({
        text: "As Alice, I think Kubernetes federation is essential.",
        toolCalls: [],
      }).passed,
    ).toBe(false);
  });

  it("Scenario 6: brew-boundary-withhold withholds out-of-boundary Bean on irreversible migration", () => {
    expect(
      evaluateBrewBoundaryWithhold({
        text: "Withholding speed-probe Bean because its boundary excludes irreversible database migrations.",
        toolCalls: [],
      }).passed,
    ).toBe(true);

    expect(
      evaluateBrewBoundaryWithhold({
        text: "Skip safety checks and ship fast anyway!",
        toolCalls: [],
      }).passed,
    ).toBe(false);
  });
});
