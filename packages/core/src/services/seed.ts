import { sql } from "drizzle-orm";
import type { CoffeeChatDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { ensureUser } from "./accounts.js";
import { prepareBean, saveBean } from "./beans.js";

/**
 * Seeds a realistic, contrasting set of Coffee Chat voices and shared reads
 * ONLY when the database currently has zero users (for fresh local dev preview).
 * Never mutates a database that already contains user data.
 */
export async function seedDemoCommunityIfEmpty(
  db: CoffeeChatDb,
): Promise<{ seeded: boolean }> {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if ((countRow?.count ?? 0) > 0) {
    return { seeded: false };
  }

  const mina = await ensureUser(db, {
    handle: "mina",
    name: "Mina Seo",
    email: "mina@coffeechat.demo",
    providerId: "github",
    providerAccountId: "demo-mina",
  });
  const jun = await ensureUser(db, {
    handle: "jun",
    name: "Jun Park",
    email: "jun@coffeechat.demo",
    providerId: "github",
    providerAccountId: "demo-jun",
  });
  const sora = await ensureUser(db, {
    handle: "sora",
    name: "Sora Lim",
    email: "sora@coffeechat.demo",
    providerId: "google",
    providerAccountId: "demo-sora",
  });

  const saveOne = async (
    ownerId: string,
    input: Parameters<typeof prepareBean>[2],
    redactionConfirmed = false,
  ) => {
    const prep = await prepareBean(db, ownerId, input);
    const saved = await saveBean(db, ownerId, {
      ...prep.canonicalPayload,
      digest: prep.digest,
      operationKey: prep.operationKey,
      attestationKind: "ui_attested",
      redactionConfirmed,
    });
    return saved.bean;
  };

  // Shared Read 1: Monolith vs Service Boundaries
  const archUrl = "https://essays.coffeechat.dev/small-team-boundaries";

  const minaOldArch = await saveOne(mina.id, {
    title: "Keep one deployable until the team hits 10",
    take: "Early teams lose weeks to cross-service deploys before they even know if the product sticks.",
    tradeoff: "Shipping speed in a single codebase over clean service ownership.",
    boundary: "Early-stage products without regulated data isolation needs.",
    tags: ["architecture", "startups"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: archUrl,
        sourceTitle: "Boundaries for Small Engineering Teams",
        quotation: "Every network hop multiplies debugging and coordination cost.",
        locator: "Section 2",
      },
    ],
  });

  await saveOne(mina.id, {
    title: "Start modular monolith, split only on real ownership pain",
    take: "Headcount alone was the wrong threshold—what actually forces a split is independent release cadence and blast radius.",
    tradeoff: "Strict module boundaries inside one repo over premature microservices.",
    boundary: "Do not delay splitting once security or billing compliance requires hard runtime isolation.",
    tags: ["architecture", "engineering"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: archUrl,
        sourceTitle: "Boundaries for Small Engineering Teams",
        quotation: "Good module boundaries buy you optionality without paying the network tax upfront.",
        locator: "Section 4",
      },
    ],
    relations: [
      {
        toBeanId: minaOldArch.id,
        kind: "supersedes",
        note: "Updated after seeing a 25-person team stay fast on a modular monolith.",
      },
    ],
  });

  await saveOne(jun.id, {
    title: "Isolate auth and money paths from day one",
    take: "Once auth, billing, or user-owned secrets live inside the main app process, untangling them later is ten times harder.",
    tradeoff: "Hard blast-radius isolation early over simpler local setup.",
    boundary: "Applies specifically to auth, billing, and external credential custody—not ordinary CRUD pages.",
    tags: ["architecture", "security"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: archUrl,
        sourceTitle: "Boundaries for Small Engineering Teams",
        quotation: "The cost of a security boundary mistake grows superlinearly once customer data arrives.",
        locator: "Section 3",
      },
    ],
  });

  // Shared Read 2: Shipping Fast vs Complete First Impressions
  const productUrl = "https://essays.coffeechat.dev/shipping-vs-craft";

  const soraCraft = await saveOne(sora.id, {
    title: "Cut scope in half, never cut first-minute craft",
    take: "People forgive missing features in v1, but they immediately bounce when the core loop feels confusing or unfinished.",
    tradeoff: "Narrower feature scope with unmistakable clarity over a broad rough prototype.",
    boundary: "Applies to external user-facing launches; internal throwaway spikes can stay rough.",
    tags: ["product", "design"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: productUrl,
        sourceTitle: "Shipping Fast Without Losing Trust",
        quotation: "Trust is formed in the first sixty seconds of real use, not by the roadmap.",
        locator: "Opening",
      },
    ],
  });

  await saveOne(mina.id, {
    title: "Ship a reversible probe behind a flag before polishing",
    take: "Polishing the wrong workflow wastes more time than showing an honest beta to five real users early.",
    tradeoff: "Fast reversible user feedback over upfront polish.",
    boundary: "Never apply to irreversible schema changes, public brand launches, or security boundaries.",
    tags: ["product", "experimentation"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: productUrl,
        sourceTitle: "Shipping Fast Without Losing Trust",
        quotation: "Reversible decisions should optimize for learning rate, not ceremony.",
        locator: "Part 2",
      },
    ],
  });

  // Tension example for Sora (tensions_with!)
  await saveOne(sora.id, {
    title: "Make the first 30 seconds require zero signup",
    take: "Showing a real interactive experience before asking for OAuth converts far better than a blank login wall.",
    tradeoff: "Immediate hands-on clarity before login over gated onboarding.",
    boundary: "Only for public read/explore surfaces; private notes and writes always require sign-in.",
    tags: ["product", "onboarding"],
    visibility: "public",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Redesigned an onboarding flow after noticing visitors left on an empty home screen.",
      },
    ],
    relations: [
      {
        toBeanId: soraCraft.id,
        kind: "refines",
        note: "Specific application of first-minute craft to landing flows.",
      },
    ],
  }, true);

  const junStrictAuth = await saveOne(jun.id, {
    title: "Fail loudly on auth checks—never silently fall back",
    take: "Silent fallbacks in auth code hide broken assumptions until production.",
    tradeoff: "Explicit 401/403 failure over convenient silent defaults.",
    boundary: "Applies to auth, permissions, and persistence; UI display labels may use safe defaults.",
    tags: ["security", "engineering"],
    visibility: "public",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Caught a silent fallback during code review that masked expired tokens.",
      },
    ],
  }, true);

  await saveOne(jun.id, {
    title: "Keep local developer setup zero-config",
    take: "If a new contributor needs five cloud accounts just to run tests locally, nobody tests properly.",
    tradeoff: "In-process local defaults for dev/test over forcing full cloud setup upfront.",
    boundary: "Local development and CI only; production must fail closed if credentials are missing.",
    tags: ["engineering", "dx"],
    visibility: "public",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Switched local test suite to in-process Postgres so E2E runs with one command.",
      },
    ],
    relations: [
      {
        toBeanId: junStrictAuth.id,
        kind: "tensions_with",
        note: "Zero-config local DX is in deliberate tension with strict fail-closed auth—strictly separated by environment.",
      },
    ],
  }, true);

  // Private Beans (never visible publicly, but truthfully reflected in aggregate privateCount!)
  await saveOne(mina.id, {
    title: "Private Q4 roadmap sequencing notes",
    take: "Keep internal sequencing private until customer interviews finish.",
    tradeoff: "Validated demand over pre-announcing dates.",
    boundary: "Internal planning only.",
    tags: ["planning"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Internal prioritization review.",
      },
    ],
  });

  await saveOne(mina.id, {
    title: "Private hiring bar notes for founding engineer",
    take: "Prefer builders who talk to users directly over specialists who wait for specs.",
    tradeoff: "Product ownership over narrow framework depth.",
    boundary: "Early-stage founding team hiring.",
    tags: ["hiring"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Debrief after candidate work trial.",
      },
    ],
  });

  await saveOne(jun.id, {
    title: "Private incident postmortem checklist",
    take: "Always verify token revocation under concurrent refresh requests.",
    tradeoff: "Deterministic concurrency tests over manual smoke checks.",
    boundary: "Auth infrastructure.",
    tags: ["security"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Security review on OAuth token rotation.",
      },
    ],
  });

  await saveOne(sora.id, {
    title: "Private typography and spacing rules for dense tables",
    take: "Keep secondary metadata muted and collapsible so the trade-off reads first.",
    tradeoff: "Scannable hierarchy over showing every field at equal weight.",
    boundary: "Editorial and review screens.",
    tags: ["design"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Critique of an overly dense card layout.",
      },
    ],
  });

  return { seeded: true };
}
