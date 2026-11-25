"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { SegmentedControl } from "@openboa/yogurt/segmented-control";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import type {
  BeanDetail,
  HydratedShelfRef,
  PublicPersonCard,
} from "@coffee-chat/core";

export interface FeaturedTableData {
  originId: string;
  normalizedUrl: string;
  sourceTitle: string | null;
  beans: BeanDetail[];
}

export interface HomeClientProps {
  signedIn: boolean;
  totalCorpusPublicCount: number;
  featuredTable: FeaturedTableData | null;
  people: PublicPersonCard[];
  publicBeans: BeanDetail[];
  filteredTotalCount: number;
  page: number;
  pageSize: number;
  initialQuery: string;
  initialTag: string;
  initialShelfRefs: HydratedShelfRef[];
  activeGrantCount?: number;
}

type BrewDemoMode = "unbrewed" | "speed" | "isolation";

const DEMO_QUESTION =
  "Our 6-person team is shipping fast. Should we split auth and billing out of our monolith right now?";

const DEMO_MODES: Record<
  BrewDemoMode,
  {
    badge: string;
    badgeTone: "neutral" | "brand" | "accent";
    headline: string;
    answer: string;
    tradeoff: string | null;
    boundary: string | null;
    attribution: string;
  }
> = {
  unbrewed: {
    badge: "Unbrewed · Default AI",
    badgeTone: "neutral",
    headline: "“It depends on your team size and long-term goals…”",
    answer:
      "Monoliths are simpler to deploy early on, while microservices provide better isolation and independent scaling. Consider evaluating your team’s operational maturity and future roadmap before deciding.",
    tradeoff: null,
    boundary: null,
    attribution:
      "Polite, factual, and completely decaf—forces you to re-explain your priorities every time.",
  },
  speed: {
    badge: "Brewed · Speed-First Taste",
    badgeTone: "brand",
    headline: "Keep one deployable until you hit 10 engineers.",
    answer:
      "Keep auth and billing as clean modules inside your single deployable for now. At 6 engineers, cross-service deploys slow down every product iteration more than module boundaries cost.",
    tradeoff: "Shipping speed in one codebase over premature service ownership.",
    boundary:
      "Withhold if regulated data isolation or external compliance requires hard runtime separation.",
    attribution:
      "Guided by 1 confirmed Bean (Reading Origin) · applied only within its stated boundary.",
  },
  isolation: {
    badge: "Brewed · Isolation-First Taste",
    badgeTone: "accent",
    headline: "Isolate auth and money paths on day one.",
    answer:
      "Pull auth and billing behind a dedicated boundary immediately, even at 6 engineers. Keep ordinary product features in the monolith, but never share blast radius with credentials or payments.",
    tradeoff:
      "Hard blast-radius isolation early over simpler local setup and debugging.",
    boundary:
      "Applies specifically to auth, billing, and secret custody—not ordinary CRUD features.",
    attribution:
      "Guided by 1 confirmed Bean (Work Origin) · same model, completely different decision.",
  },
};

export function HomeClient({
  signedIn,
  totalCorpusPublicCount,
  featuredTable,
}: HomeClientProps) {
  const router = useRouter();
  const [brewMode, setBrewMode] = useState<BrewDemoMode>("speed");
  const activeDemo = DEMO_MODES[brewMode];

  const contrastingPreview = (() => {
    if (!featuredTable) return [];
    const seen = new Set<string>();
    const distinct = featuredTable.beans.filter((b) => {
      if (seen.has(b.ownerHandle)) return false;
      seen.add(b.ownerHandle);
      return true;
    });
    return distinct.length >= 2
      ? distinct.slice(0, 2)
      : featuredTable.beans.slice(0, 2);
  })();

  return (
    <Stack gap={48}>
      {/* 1. HERO: Instant value proposition with Coffee Chat Taste wordplay */}
      <section className="hero-section">
        <Stack gap={24}>
          <Inline gap={8} align="center">
            <Badge tone="brand" dot={false}>
              Coffee Chat
            </Badge>
            <Text variant="meta">
              Knowledge is shared. What you make of it is personal.
            </Text>
          </Inline>

          <h1 className="hero-headline">
            AI already has knowledge.
            <br />
            Give it your Taste.
          </h1>

          <p className="hero-subline">
            Raw links are just green beans. <strong>Roast</strong> your real
            calls and reading takeaways into private <strong>Beans</strong>—then{" "}
            <strong>Brew</strong> your Taste into Codex, Claude, ChatGPT,
            Antigravity, or Cursor.
          </p>

          <Inline gap={12} align="center">
            <Button
              emphasis="filled"
              tone="brand"
              size="comfortable"
              onClick={() =>
                router.push(
                  signedIn
                    ? "/me?compose=1"
                    : "/signin?returnTo=%2Fme%3Fcompose%3D1",
                )
              }
            >
              {signedIn ? "Roast a Bean" : "Roast your first Bean"}
            </Button>
            <Button
              emphasis="soft"
              size="comfortable"
              onClick={() => router.push("/connect")}
            >
              Open Brew Bar
            </Button>
            {signedIn ? (
              <Link href="/me">Go to My Roastery →</Link>
            ) : null}
          </Inline>
        </Stack>
      </section>

      {/* 2. INTERACTIVE ZERO-AI PROOF: Same prompt, completely different Brew */}
      <Card
        title="Same prompt. Different Brew."
        description="Switch the Roast below—watch one confirmed Bean turn watered-down AI advice into a sharp call"
        variant="raised"
        density="spacious"
      >
        <Stack gap={16}>
          <blockquote className="bean-quote">
            <Stack gap={4}>
              <Text variant="meta">Question asked to your AI</Text>
              <Text as="p" variant="body">
                &ldquo;{DEMO_QUESTION}&rdquo;
              </Text>
            </Stack>
          </blockquote>

          <SegmentedControl
            label="Compare AI output by Taste"
            value={brewMode}
            onValueChange={(val) => setBrewMode(val as BrewDemoMode)}
            options={[
              { id: "unbrewed", label: "Unbrewed (Decaf AI)" },
              { id: "speed", label: "Brew · Speed-first Taste" },
              { id: "isolation", label: "Brew · Isolation-first Taste" },
            ]}
          />

          <Stack gap={12}>
            <Inline gap={8} align="center">
              <Badge tone={activeDemo.badgeTone} dot={false}>
                {activeDemo.badge}
              </Badge>
            </Inline>

            <Heading level={3}>{activeDemo.headline}</Heading>
            <p className="editorial-lead">{activeDemo.answer}</p>

            {activeDemo.tradeoff ? (
              <div className="bean-pull">
                <Stack gap={2}>
                  <Text variant="meta">What mattered more</Text>
                  <Text as="p" variant="body">
                    {activeDemo.tradeoff}
                  </Text>
                </Stack>
              </div>
            ) : null}

            {activeDemo.boundary ? (
              <p className="bean-footnote">Except when: {activeDemo.boundary}</p>
            ) : null}

            <Divider />
            <Text variant="meta">{activeDemo.attribution}</Text>
          </Stack>
        </Stack>
      </Card>

      {/* 3. HOW IT WORKS: Roast -> Brew -> Coffee Chat (no heavy box nesting) */}
      <Stack gap={24}>
        <Stack gap={4}>
          <Text variant="meta">How Coffee Chat works</Text>
          <Heading level={2}>From raw thought to sharper AI in three beats</Heading>
        </Stack>

        <div className="steps-grid">
          <Stack gap={8}>
            <Text variant="meta">01 · Roast · Distill raw thought</Text>
            <Heading level={3}>Turn green links &amp; calls into Beans</Heading>
            <Text as="p" variant="help">
              Raw articles are just green beans. Capture what clicked, the
              trade-off you actually prioritize, and when your rule stops
              applying. Everything starts Private by default.
            </Text>
          </Stack>

          <Stack gap={8}>
            <Text variant="meta">02 · Brew · Pour into your AI</Text>
            <Heading level={3}>Serve your Taste in any AI host</Heading>
            <Text as="p" variant="help">
              Connect Codex, Claude Code, ChatGPT, Antigravity, or Cursor once
              at the Brew Bar. Your AI brings your confirmed criteria into new
              decisions instead of serving generic decaf.
            </Text>
          </Stack>

          <Stack gap={8}>
            <Text variant="meta">03 · Coffee Chat · Tables &amp; Shelf</Text>
            <Heading level={3}>Compare contrasting minds</Heading>
            <Text as="p" variant="help">
              Sit at a shared Table to see how two people read the same essay
              and pulled opposite lessons. Stock your Shelf with voices you
              trust and Brew their angle—never impersonated.
            </Text>
          </Stack>
        </div>
      </Stack>

      {/* 4. PRIVACY & ZERO-AI PROMISE BAND */}
      <div className="trust-band">
        <Text variant="meta">Private by default</Text>
        <Text variant="meta">·</Text>
        <Text variant="meta">Nothing roasted without your confirmation</Text>
        <Text variant="meta">·</Text>
        <Text variant="meta">Zero server AI — runs in your own AI host</Text>
        <Text variant="meta">·</Text>
        <Text variant="meta">Revoke access in one click</Text>
      </div>

      {/* 5. SECONDARY BOTTOM SHOWCASE: Community Table preview (low priority, after value is clear) */}
      {totalCorpusPublicCount > 0 && featuredTable ? (
        <Stack gap={16}>
          <Inline justify="between" align="baseline" gap={12}>
            <Stack gap={4}>
              <Text variant="meta">On the Table right now</Text>
              <Heading level={2}>
                {featuredTable.sourceTitle ?? featuredTable.normalizedUrl}
              </Heading>
            </Stack>
            <Inline gap={12} align="center">
              <Link href={`/sources/${featuredTable.originId}`}>
                Open this Table →
              </Link>
              <Link href="/sources">All Tables</Link>
            </Inline>
          </Inline>

          <div className="split-grid">
            {contrastingPreview.map((b) => (
              <Card key={b.id} variant="raised" density="regular">
                <Stack gap={12}>
                  <Inline gap={8} align="center">
                    <Avatar label={b.ownerDisplayName} size="compact" />
                    <Inline gap={6} align="baseline">
                      <Link href={`/@${b.ownerHandle}`}>
                        <Text variant="body">{b.ownerDisplayName}</Text>
                      </Link>
                      <Text variant="meta">@{b.ownerHandle}</Text>
                    </Inline>
                  </Inline>
                  <Heading level={3}>{b.title}</Heading>
                  <div className="bean-pull">
                    <Stack gap={2}>
                      <Text variant="meta">What mattered more</Text>
                      <Text as="p" variant="body">
                        {b.tradeoff}
                      </Text>
                    </Stack>
                  </div>
                  <p className="bean-footnote">Except when: {b.boundary}</p>
                </Stack>
              </Card>
            ))}
          </div>
        </Stack>
      ) : (
        <Card
          title="Start the first Coffee Chat Table"
          description="No public Beans yet — begin privately in My Roastery, and share one whenever you want to open the first Table"
          variant="raised"
          density="regular"
          action={
            <Inline gap={8}>
              <Button
                emphasis="filled"
                tone="neutral"
                size="compact"
                onClick={() =>
                  router.push(
                    signedIn
                      ? "/me?compose=1"
                      : "/signin?returnTo=%2Fme%3Fcompose%3D1",
                  )
                }
              >
                Roast a private Bean
              </Button>
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => router.push("/connect")}
              >
                Open Brew Bar
              </Button>
            </Inline>
          }
        >
          <Text variant="help">
            Every Bean starts private to you and your connected AI. Share only
            the takes you explicitly choose to put On the Table.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
