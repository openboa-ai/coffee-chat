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

  const claire = await ensureUser(db, {
    handle: "claire",
    name: "Claire Brooks",
    email: "claire@coffeechat.demo",
    providerId: "github",
    providerAccountId: "demo-claire",
  });
  const david = await ensureUser(db, {
    handle: "david",
    name: "David Chen",
    email: "david@coffeechat.demo",
    providerId: "github",
    providerAccountId: "demo-david",
  });
  const hannah = await ensureUser(db, {
    handle: "hannah",
    name: "Hannah Kim",
    email: "hannah@coffeechat.demo",
    providerId: "google",
    providerAccountId: "demo-hannah",
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

  // Shared Read 1 (Lead Featured Table): Shipping Fast Without Losing Trust (universal product & work call)
  const productUrl = "https://essays.coffeechat.dev/shipping-vs-trust";

  const claireDraftOld = await saveOne(claire.id, {
    title: "Put every early idea in front of customers on day one",
    take: "Waiting until a workflow feels polished hides whether people even want the core outcome.",
    tradeoff: "Fast customer signal over upfront polish.",
    boundary: "Internal prototypes and opt-in betas only.",
    tags: ["product", "speed"],
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

  await saveOne(claire.id, {
    title: "Show an honest draft to 5 real people before polishing",
    take: "Polishing the wrong workflow wastes a month—showing a clearly labeled early draft to five real users exposes blind spots in an hour.",
    tradeoff: "Fast real-world feedback over upfront perfection.",
    boundary: "Public brand launches or irreversible customer commitments.",
    tags: ["product", "decisions"],
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
    relations: [
      {
        toBeanId: claireDraftOld.id,
        kind: "supersedes",
        note: "Refined after an unannounced beta confused non-opt-in customers.",
      },
    ],
  });

  await saveOne(david.id, {
    title: "Never ship a shortcut that touches money or privacy",
    take: "Early users forgive a rough layout or missing option, but they never forget a broken promise around billing or personal data.",
    tradeoff: "Durable customer trust on day one over faster early demos.",
    boundary: "Throwaway visual prototypes using sample data only.",
    tags: ["trust", "product"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: productUrl,
        sourceTitle: "Shipping Fast Without Losing Trust",
        quotation: "Trust compounds slowly and breaks in a single sloppy release.",
        locator: "Opening",
      },
    ],
  });

  const hannahCraft = await saveOne(hannah.id, {
    title: "Cut scope in half, never cut first-minute clarity",
    take: "People forgive missing features in v1, but they immediately leave when the core promise feels cluttered or confusing.",
    tradeoff: "Narrower scope with unmistakable clarity over a broad rough release.",
    boundary: "External launches; internal rough drafts can stay messy.",
    tags: ["design", "product"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: productUrl,
        sourceTitle: "Shipping Fast Without Losing Trust",
        quotation: "Trust is formed in the first sixty seconds of real use, not by the roadmap.",
        locator: "Part 1",
      },
    ],
  });

  // Shared Read 2: Small Team Decisions (relatable to both operators and builders)
  const teamUrl = "https://essays.coffeechat.dev/small-team-boundaries";

  await saveOne(claire.id, {
    title: "Keep small teams on one shared system until growth hurts",
    take: "Splitting work across separate systems too early slows every decision down with coordination overhead.",
    tradeoff: "Shared momentum in one place over clean separate ownership.",
    boundary: "Regulated work requiring hard compliance separation.",
    tags: ["teams", "architecture"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: teamUrl,
        sourceTitle: "Boundaries for Small Teams",
        quotation: "Every handoff boundary multiplies coordination cost.",
        locator: "Section 2",
      },
    ],
  });

  await saveOne(david.id, {
    title: "Separate high-risk permissions and billing on day one",
    take: "Keep ordinary workflows simple and unified, but isolate payments, credentials, and sensitive customer data before scale locks them in.",
    tradeoff: "Hard blast-radius protection early over simpler initial setup.",
    boundary: "High-risk money, privacy, and access paths only.",
    tags: ["trust", "architecture"],
    visibility: "public",
    origins: [
      {
        kind: "source_excerpt",
        url: teamUrl,
        sourceTitle: "Boundaries for Small Teams",
        quotation: "The cost of a trust boundary mistake grows superlinearly once customer data arrives.",
        locator: "Section 3",
      },
    ],
  });

  // Work Origin Beans with explicit relations (refines & tensions_with)
  await saveOne(
    hannah.id,
    {
      title: "Show the real experience before asking people to sign up",
      take: "Letting someone feel the actual outcome in 10 seconds works far better than greeting them with a wall of marketing boxes.",
      tradeoff: "Immediate hands-on clarity over gated onboarding.",
      boundary: "Public landing surfaces; personal notes always require sign-in.",
      tags: ["design", "onboarding"],
      visibility: "public",
      origins: [
        {
          kind: "work_episode",
          episodeSummary: "Redesigned a product homepage after watching first-time visitors bounce before signing in.",
        },
      ],
      relations: [
        {
          toBeanId: hannahCraft.id,
          kind: "refines",
          note: "Direct application of first-minute clarity to product entry.",
        },
      ],
    },
    true,
  );

  const davidSayNo = await saveOne(
    david.id,
    {
      title: "Name what you are dropping before adding a new goal",
      take: "Saying yes to a new priority without naming what pauses silently burns out the team and produces mediocre results everywhere.",
      tradeoff: "Explicit trade-offs and focus over appearing responsive to every request.",
      boundary: "Urgent customer incidents that pause normal plans anyway.",
      tags: ["leadership", "decisions"],
      visibility: "public",
      origins: [
        {
          kind: "work_episode",
          episodeSummary: "Quarterly planning review where three new initiatives landed without dropping prior commitments.",
        },
      ],
    },
    true,
  );

  await saveOne(
    david.id,
    {
      title: "Keep small urgent fixes fast without waiting for quarterly planning",
      take: "If fixing a glaring customer paper cut requires a formal prioritization cycle, teams lose their sense of ownership.",
      tradeoff: "Fast responsiveness on small fixes over strict roadmap gatekeeping.",
      boundary: "Small half-day improvements only; multi-week bets still require explicit trade-offs.",
      tags: ["leadership", "speed"],
      visibility: "public",
      origins: [
        {
          kind: "work_episode",
          episodeSummary: "Created a lightweight lane for customer paper cuts alongside quarterly goals.",
        },
      ],
      relations: [
        {
          toBeanId: davidSayNo.id,
          kind: "tensions_with",
          note: "Fast responsiveness for small fixes sits in healthy tension with strict focus—separated by scope size.",
        },
      ],
    },
    true,
  );

  // Private Beans (never visible publicly, truthfully reflected in aggregate privateCount)
  await saveOne(claire.id, {
    title: "Lead with the hard truth, not the build-up",
    take: "When a target slips or a plan breaks, put the honest status and concrete fix in the very first sentence instead of burying it on slide 4.",
    tradeoff: "Upfront trust and clarity over softening the moment.",
    boundary: "External announcements requiring legal or sensitive framing first.",
    tags: ["communication"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Weekly leadership update after a launch date moved by two weeks.",
      },
    ],
  });

  await saveOne(claire.id, {
    title: "Hire fast learners over ready-made playbooks",
    take: "Prefer people who talk to customers directly and own fuzzy problems over specialists waiting for a written spec.",
    tradeoff: "Ownership and learning speed over exact prior industry background.",
    boundary: "Roles requiring day-one regulatory certification.",
    tags: ["hiring"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Debrief after final-round candidate interviews.",
      },
    ],
  });

  await saveOne(david.id, {
    title: "Private quarterly review checklist for customer trust",
    take: "Audit every billing and access change against worst-case failure paths before signing off.",
    tradeoff: "Explicit failure checks over optimistic manual walkthroughs.",
    boundary: "Internal trust and risk reviews.",
    tags: ["trust"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Internal operational readiness review.",
      },
    ],
  });

  await saveOne(hannah.id, {
    title: "Private editing rule: cut half the words before shipping",
    take: "If a screen needs a paragraph to explain what a button does, the structure is wrong—fix the layout before adding help text.",
    tradeoff: "Immediate visual comprehension over exhaustive documentation.",
    boundary: "Product screens and landing pages.",
    tags: ["design"],
    visibility: "private",
    origins: [
      {
        kind: "work_episode",
        episodeSummary: "Design critique of an overly verbose first-run screen.",
      },
    ],
  });

  return { seeded: true };
}
