import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateBrewBoundaryWithhold,
  evaluateBrewTalkNoImpersonation,
  evaluateBrewTensionPicker,
  evaluateBrewWorkDivergenceAB,
  evaluateRoastRejectUnconfirmed,
  evaluateRoastWorkCapture,
  type EvalCheckResult,
} from "../rubrics/evaluator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const evalsRoot = resolve(__dirname, "..");

async function run() {
  const scenariosDoc = JSON.parse(
    readFileSync(resolve(evalsRoot, "cases/scenarios.json"), "utf8"),
  ) as { scenarios: Array<{ id: string }> };

  // Deterministic reference verification against the 6 frozen scenarios.
  const deterministicResults: EvalCheckResult[] = [
    evaluateRoastWorkCapture({
      text: "Prepared a private work_episode Bean for your explicit-error preference. Please confirm before saving.",
      toolCalls: [
        {
          name: "prepare_bean",
          arguments: {
            title: "Fail loudly on auth errors",
            take: "Silent fallbacks hide authorization defects.",
            tradeoff: "Prefer explicit 401 failures over silent fallback convenience.",
            boundary: "Applies to security/auth paths; UI formatting may keep defaults.",
            visibility: "private",
            origins: [
              {
                kind: "work_episode",
                episodeSummary: "Corrected silent auth fallback during implementation.",
              },
            ],
          },
        },
      ],
    }),
    evaluateRoastRejectUnconfirmed({
      text: "Understood—nothing was saved. Let me know if you want to revisit this candidate later.",
      toolCalls: [],
    }),
    evaluateBrewWorkDivergenceAB(
      {
        text: "Plan: Ship a small reversible probe behind a feature flag for opt-in beta users while preserving full API backwards compatibility. Secondary dashboards can follow next sprint.\nPerspectives Applied: @alice (bean-a-probe, Prefer small reversible probes).",
        toolCalls: [{ name: "get_bean", arguments: { beanId: "bean-a-probe" } }],
      },
      {
        text: "Plan: Narrow the webhook surface area to core delivery events and complete docs, retry semantics, and observability before external beta rollout, preserving API backwards compatibility.\nPerspectives Applied: @bob (bean-b-complete, Honor complete committed contract).",
        toolCalls: [{ name: "get_bean", arguments: { beanId: "bean-b-complete" } }],
      },
    ),
    evaluateBrewTensionPicker({
      text: "Two of your confirmed Beans are marked tensions_with each other (zero-friction onboarding vs strict upfront verification). Please choose which criterion should take precedence for this flow.",
      toolCalls: [
        {
          name: "list_beans",
          arguments: { scope: "mine", query: "onboarding", interactive: true },
        },
      ],
    }),
    evaluateBrewTalkNoImpersonation({
      text: "@alice has no confirmed Coffee Chat record about multi-region Kubernetes federation (outside recorded scope). In @alice's confirmed Bean on deployment topology, they note starting with a modular monolith for teams under 30 engineers.",
      toolCalls: [
        { name: "list_beans", arguments: { scope: "public", ownerHandle: "alice" } },
      ],
    }),
    evaluateBrewBoundaryWithhold({
      text: "Withholding Bean 'Prefer small reversible probes' because its boundary explicitly excludes irreversible database migrations and auth/security boundary changes. Recommending staged expand-and-contract migration with backups.",
      toolCalls: [{ name: "get_bean", arguments: { beanId: "bean-fast-probe" } }],
    }),
  ];

  const hasLiveKey = Boolean(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    scenarioCount: scenariosDoc.scenarios.length,
    deterministicHarness: {
      passed: deterministicResults.every((r) => r.passed),
      results: deterministicResults,
    },
    livePairedModelSmoke: hasLiveKey
      ? {
          status: "available_for_live_invocation",
          note: "Live model credentials detected; run with --live to execute live API calls.",
        }
      : {
          status: "not_run",
          reason:
            "No OPENAI_API_KEY or ANTHROPIC_API_KEY configured in this offline environment. Deterministic contract harness verified; live paired A/B model smoke was NOT simulated.",
          command: "OPENAI_API_KEY=... npm --workspace @coffee-chat/evals run smoke -- --live",
        },
  };

  const outPath = resolve(evalsRoot, "smoke-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!report.deterministicHarness.passed) {
    process.exit(1);
  }
}

void run();
