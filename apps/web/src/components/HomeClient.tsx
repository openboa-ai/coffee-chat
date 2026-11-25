"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentAvatar } from "@openboa/yogurt/agent-avatar";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { ButtonGroup } from "@openboa/yogurt/button-group";
import { Card } from "@openboa/yogurt/card";
import { CodeBlock } from "@openboa/yogurt/code-block";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Message } from "@openboa/yogurt/message";
import { ProjectMark } from "@openboa/yogurt/project-mark";
import { SegmentedControl } from "@openboa/yogurt/segmented-control";
import { Stack } from "@openboa/yogurt/stack";
import { Status } from "@openboa/yogurt/status";
import { Tabs } from "@openboa/yogurt/tabs";
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
  mcpUrl: string;
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

type StageAct = "brew" | "roast" | "chat";
type BrewMode = "decaf" | "growth" | "craft";
type ChatGuest = "claire" | "david";

interface StageBeanCardData {
  id: string;
  label: string;
  title: string;
  tradeoff: string;
  boundary: string;
  tag: string;
}

const BREW_BEANS: [StageBeanCardData, StageBeanCardData] = [
  {
    id: "growth",
    label: "Growth Roast · Private",
    title: "Hire fast learners over ready-made playbooks",
    tradeoff:
      "Ownership and learning speed over exact prior industry background.",
    boundary: "Roles requiring day-one certification.",
    tag: "#hiring",
  },
  {
    id: "craft",
    label: "Specialist Roast · Work",
    title: "Pick proven craft when the deadline won’t move",
    tradeoff: "Immediate execution quality over long-term versatility.",
    boundary: "Roles where scope shifts every month.",
    tag: "#hiring",
  },
];

const CHAT_GUEST_DATA: Record<
  ChatGuest,
  {
    fullName: string;
    handle: string;
    prompt: string;
    headline: string;
    body: string;
    cite: string;
    beans: [StageBeanCardData, StageBeanCardData];
  }
> = {
  claire: {
    fullName: "Claire Brooks",
    handle: "@claire",
    prompt:
      "Have a Coffee Chat with @claire—should we polish our release another month, or show a rough draft to 10 customers this week?",
    headline:
      "Based on @claire’s Beans, show an honest draft to 10 people this week.",
    body: "@claire puts real customer signal ahead of upfront polish—polishing the wrong workflow wastes a month. Share a clearly labeled early version now, as long as nothing is irreversible.",
    cite: "From @claire’s confirmed Bean · Reversible bets only · Never roleplayed",
    beans: [
      {
        id: "claire-1",
        label: "@claire · Public Bean",
        title: "Show an honest draft to 5 real people first",
        tradeoff: "Fast real-world feedback over upfront perfection.",
        boundary: "Public brand launches or irreversible commitments.",
        tag: "#product",
      },
      {
        id: "claire-2",
        label: "@claire · Public Bean",
        title: "Keep small teams focused on one shared goal",
        tradeoff: "Momentum together over separate tracks.",
        boundary: "Regulated teams needing hard separation.",
        tag: "#teams",
      },
    ],
  },
  david: {
    fullName: "David Chen",
    handle: "@david",
    prompt:
      "Have a Coffee Chat with @david—should we polish our release another month, or show a rough draft to 10 customers this week?",
    headline:
      "Based on @david’s Beans, ship rough only if zero money or private data is touched.",
    body: "@david puts durable customer trust ahead of demo speed. People forgive a rough screen, never a billing or privacy slip—only test early on sample data until trust paths are airtight.",
    cite: "From @david’s confirmed Bean · Sample-data prototypes only · Never roleplayed",
    beans: [
      {
        id: "david-1",
        label: "@david · Public Bean",
        title: "Never ship a shortcut that touches money or privacy",
        tradeoff: "Durable customer trust on day one over faster early demos.",
        boundary: "Visual prototypes with sample data only.",
        tag: "#trust",
      },
      {
        id: "david-2",
        label: "@david · Public Bean",
        title: "Name what you’re dropping before adding a new goal",
        tradeoff: "Real focus over saying yes to every request.",
        boundary: "Urgent incidents that pause normal work.",
        tag: "#leadership",
      },
    ],
  },
};

export function HomeClient({
  signedIn,
  mcpUrl,
  totalCorpusPublicCount,
  featuredTable,
}: HomeClientProps) {
  const router = useRouter();
  const [act, setAct] = useState<StageAct>("brew");
  const [brewMode, setBrewMode] = useState<BrewMode>("growth");
  const [guest, setGuest] = useState<ChatGuest>("claire");
  const [playNonce, setPlayNonce] = useState(0);

  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [roastConfirmed, setRoastConfirmed] = useState(false);

  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const universalStartPrompt = `Connect to Coffee Chat at ${mcpUrl} (sign in when prompted). Once connected, help me Roast my first private Bean from a real decision or article I share with you—ask what mattered more and when the rule stops applying, and wait for my confirmation before saving.`;

  const copyPromptText = async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Clipboard may be unavailable in restricted contexts; full prompt reveals below.
    }
  };

  const handleCopyStartPrompt = async () => {
    await copyPromptText(universalStartPrompt);
    setCopiedHeroPrompt(true);
    setShowPromptPreview(true);
    window.setTimeout(() => setCopiedHeroPrompt(false), 3500);
  };

  const getActiveResponseText = useCallback((): string => {
    if (act === "brew") {
      if (brewMode === "decaf") {
        return "Generalists offer flexibility and long-term growth, while specialists bring immediate domain knowledge. Consider your team’s current needs and timeline before deciding.";
      }
      if (brewMode === "growth") {
        return "Based on your Bean, ownership and learning speed outrank prior playbooks. Hire the generalist with a clear 30-day ramp—and only flip to the specialist if certification is required on day one.";
      }
      return "Based on your Bean, immediate execution quality beats versatility when the deadline won’t move. Pick the specialist as long as the role’s scope is already well defined.";
    }
    if (act === "chat") {
      return CHAT_GUEST_DATA[guest].body;
    }
    return "";
  }, [act, brewMode, guest]);

  useEffect(() => {
    clearTimers();
    const fullText = getActiveResponseText();
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setStreamedText(fullText);
      setIsStreaming(false);
      setRoastConfirmed(act === "roast");
      return clearTimers;
    }

    setStreamedText("");
    setIsStreaming(act !== "roast");
    setRoastConfirmed(false);

    if (act === "roast") {
      schedule(900, () => setRoastConfirmed(true));
      return clearTimers;
    }

    schedule(180, () => {
      const words = fullText.split(" ");
      let idx = 0;
      const step = () => {
        if (idx < words.length) {
          idx += 1;
          setStreamedText(words.slice(0, idx).join(" "));
          schedule(18, step);
        } else {
          setIsStreaming(false);
        }
      };
      step();
    });

    return clearTimers;
  }, [
    act,
    brewMode,
    guest,
    playNonce,
    clearTimers,
    schedule,
    getActiveResponseText,
  ]);

  const contrastingPreview = (() => {
    if (!featuredTable) return [];
    const ordered = [...featuredTable.beans].sort(
      (a, b) =>
        Number(Boolean(a.supersededByBeanId)) -
        Number(Boolean(b.supersededByBeanId)),
    );
    const seen = new Set<string>();
    const distinct = ordered.filter((b) => {
      if (seen.has(b.ownerHandle)) return false;
      seen.add(b.ownerHandle);
      return true;
    });
    return distinct.length >= 2 ? distinct.slice(0, 2) : ordered.slice(0, 2);
  })();

  const isDecaf = act === "brew" && brewMode === "decaf";
  const activeGuest = CHAT_GUEST_DATA[guest];

  const promptText =
    act === "brew"
      ? "Two finalists for a key role: a fast-learning generalist, or a proven specialist with our exact background. Who should we pick?"
      : act === "roast"
        ? "No—don’t bury the missed target on slide 4. Put the honest status and our fix in the very first sentence."
        : activeGuest.prompt;

  const traceLabel =
    act === "brew"
      ? brewMode === "growth"
        ? "Applied your Bean · Hire fast learners over ready-made playbooks"
        : "Applied your Bean · Pick proven craft when the deadline won’t move"
      : act === "roast"
        ? "Drafted a private Bean from your correction — waiting for confirmation"
        : `Pulled ${activeGuest.handle}’s confirmed public Beans (attributed, never roleplayed)`;

  const pluginChipLabel = isDecaf
    ? "Unplugged"
    : act === "brew"
      ? "Coffee Chat · Active"
      : act === "roast"
        ? roastConfirmed
          ? "Coffee Chat · Roasted"
          : "Coffee Chat · Draft"
        : `Coffee Chat · ${activeGuest.handle}`;

  const drawerHeading =
    act === "chat"
      ? `${activeGuest.fullName} · ${activeGuest.handle}`
      : "Your Roastery";

  const drawerSub =
    act === "roast"
      ? roastConfirmed
        ? "5 private Beans"
        : "4 private Beans"
      : act === "chat"
        ? "Public Taste"
        : "Private Beans";

  const composerHint =
    act === "brew"
      ? isDecaf
        ? "Select a Roast on the right or above to see the call flip"
        : "Select any Bean on the right or switch Roasts above"
      : act === "roast"
        ? roastConfirmed
          ? "Saved privately · ready across every connected AI"
          : "Nothing saves without your confirmation"
        : `Switch to ${guest === "claire" ? "@david" : "@claire"} above`;

  const agentGaze = isStreaming
    ? "working"
    : act === "roast" && !roastConfirmed
      ? "waiting"
      : "done";

  return (
    <div className="cc-home-stack">
      {/* 1. EDITORIAL OPENING + SCULPTED UNIVERSAL START BAR */}
      <section className="cc-hero" aria-label="Introduction">
        <span className="cc-hero-kicker">
          <ProjectMark project="coffee" label="" size={18} />
          <span>
            Personal Taste for ChatGPT, Claude, Codex, Cursor &amp; Antigravity
          </span>
        </span>

        <div className="cc-hero-grid">
          <Heading level={1} className="cc-hero-title">
            Your AI knows everything.
            <br />
            Give it <em className="cc-accent-ink">your Taste.</em>
          </Heading>

          <Text as="p" className="cc-hero-lead">
            Save how you weigh real trade-offs—so your AI answers with your
            priorities, or lets you Coffee Chat with anyone else’s.
          </Text>
        </div>

        <div className="cc-start-shell">
          <div className="cc-start-bar">
            <span className="cc-start-preview">
              <strong>Start in any AI:</strong> Connect to Coffee Chat and help
              me Roast my first private Bean…
            </span>
            <Button
              emphasis="filled"
              tone="brand"
              size="comfortable"
              onClick={() => void handleCopyStartPrompt()}
            >
              {copiedHeroPrompt
                ? "Copied — paste into any AI"
                : "Copy prompt to start in your AI"}
            </Button>
          </div>

          <div className="cc-start-subrow">
            <Text variant="meta">
              Paste into whatever AI you already use — no config file needed to
              start.
            </Text>
            <ButtonGroup label="Alternative setup options">
              <Button
                emphasis="quiet"
                size="compact"
                onClick={() => setShowPromptPreview((v) => !v)}
              >
                {showPromptPreview ? "Hide prompt" : "Read full prompt"}
              </Button>
              <Link
                href={
                  signedIn
                    ? "/me?compose=1"
                    : "/signin?returnTo=%2Fme%3Fcompose%3D1"
                }
                emphasis="quiet"
                size="compact"
              >
                {signedIn ? "Open My Roastery" : "Try in browser"}
              </Link>
              <Link href="/connect" emphasis="quiet" size="compact">
                Manual setup
              </Link>
            </ButtonGroup>
          </div>

          {showPromptPreview ? (
            <div className="prompt-code-wrap">
              <CodeBlock
                code={universalStartPrompt}
                language="text"
                onCopy={copyPromptText}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* 2. UNIFIED SPLIT STUDIO STAGE (01 Brew -> 02 Roast -> 03 Coffee Chat) */}
      <section className="cc-studio-frame" aria-label="Interactive product preview">
        <div className="cc-studio-topbar">
          <div className="cc-studio-tabs">
            <Tabs
              label="Coffee Chat use cases"
              presentation="underline"
              value={act}
              onValueChange={(next) => setAct(next as StageAct)}
              items={[
                { id: "brew", label: "01 · Brew in your AI", panel: null },
                {
                  id: "roast",
                  label: "02 · Roast from a correction",
                  panel: null,
                },
                {
                  id: "chat",
                  label: "03 · Coffee Chat with other Taste",
                  panel: null,
                },
              ]}
            />
          </div>

          {act === "brew" ? (
            <div className="cc-studio-mode-wrap">
              <SegmentedControl
                label="Compare AI output by Taste"
                value={brewMode}
                onValueChange={(v) => setBrewMode(v as BrewMode)}
                options={[
                  { id: "decaf", label: "Unplugged (Decaf)" },
                  { id: "growth", label: "Growth Roast" },
                  { id: "craft", label: "Specialist Roast" },
                ]}
              />
            </div>
          ) : act === "chat" ? (
            <div className="cc-studio-mode-wrap">
              <SegmentedControl
                label="Choose someone to Coffee Chat with"
                value={guest}
                onValueChange={(v) => setGuest(v as ChatGuest)}
                options={[
                  { id: "claire", label: "Coffee Chat with @claire" },
                  { id: "david", label: "Coffee Chat with @david" },
                ]}
              />
            </div>
          ) : null}
        </div>

        <div className="cc-studio-body">
          {/* LEFT PANE: Live AI Conversation */}
          <div className="cc-studio-conversation">
            <Stack gap={16}>
              <div className="cc-studio-session-head">
                <Inline gap={8} align="center">
                  <AgentAvatar
                    agent="Kai"
                    size={22}
                    label=""
                    state={agentGaze}
                  />
                  <Text variant="body">Your AI</Text>
                  <Text variant="meta">· Any connected chat</Text>
                </Inline>
                <Status tone={isDecaf ? "neutral" : "success"}>
                  {pluginChipLabel}
                </Status>
              </div>

              <Message
                speaker="You"
                variant="sent"
                avatar={<Avatar label="You" size="compact" />}
              >
                <Text as="p" variant="body">
                  {promptText}
                </Text>
              </Message>

              {!isDecaf ? (
                <div className="cc-studio-trace" role="status">
                  <ProjectMark project="coffee" label="" size={16} />
                  <span>{traceLabel}</span>
                </div>
              ) : null}

              <Message
                speaker="Your AI"
                variant="received"
                avatar={
                  <AgentAvatar
                    agent="Kai"
                    size={24}
                    label=""
                    state={agentGaze}
                  />
                }
              >
                {act === "roast" ? (
                  <div className="cc-studio-confirm">
                    <Inline justify="between" align="center" gap={8}>
                      <Text variant="meta">
                        Confirm Bean · Private by default
                      </Text>
                      <Status tone={roastConfirmed ? "success" : "warning"}>
                        {roastConfirmed ? "Saved" : "Waiting for confirmation"}
                      </Status>
                    </Inline>
                    <Heading level={3} className="cc-studio-takeaway">
                      Lead with the hard truth, not the build-up
                    </Heading>
                    <div className="cc-criteria-grid">
                      <Stack gap={4}>
                        <Text variant="meta">What mattered more</Text>
                        <Text as="p" variant="body">
                          Upfront trust and clarity over softening the moment.
                        </Text>
                      </Stack>
                      <Stack gap={4}>
                        <Text variant="meta">Except when</Text>
                        <Text as="p" variant="help">
                          External announcements needing legal review first.
                        </Text>
                      </Stack>
                    </div>
                    <Inline justify="between" align="center" gap={8}>
                      <Button
                        emphasis={roastConfirmed ? "soft" : "filled"}
                        tone={roastConfirmed ? "neutral" : "brand"}
                        size="compact"
                        onClick={() => setRoastConfirmed(true)}
                      >
                        {roastConfirmed
                          ? "Roasted into Roastery"
                          : "Confirm & Roast"}
                      </Button>
                      <Text variant="meta">Never saved silently</Text>
                    </Inline>
                  </div>
                ) : (
                  <Stack gap={8}>
                    <Heading
                      level={3}
                      className={
                        isDecaf
                          ? "cc-studio-takeaway cc-studio-decaf"
                          : "cc-studio-takeaway"
                      }
                    >
                      {isDecaf
                        ? "“Both candidates have strong pros and cons depending on your goals…”"
                        : act === "brew"
                          ? brewMode === "growth"
                            ? "Hire the fast-learning generalist—unless certification is required today."
                            : "Hire the proven specialist—your deadline leaves no room for ramp-up."
                          : activeGuest.headline}
                    </Heading>
                    <Text
                      as="p"
                      variant="body"
                      className={isDecaf ? "cc-studio-decaf" : undefined}
                    >
                      {streamedText}
                    </Text>
                    {!isDecaf && !isStreaming ? (
                      <Text variant="meta">
                        {act === "brew"
                          ? brewMode === "growth"
                            ? "Guided by your Growth Roast Bean · Boundary verified"
                            : "Guided by your Specialist Roast Bean · Boundary verified"
                          : activeGuest.cite}
                      </Text>
                    ) : isDecaf && !isStreaming ? (
                      <Text variant="meta">
                        No Taste connected — generic fence-sitting
                      </Text>
                    ) : null}
                  </Stack>
                )}
              </Message>
            </Stack>

            <div className="cc-studio-foot">
              <Text variant="meta">{composerHint}</Text>
              <Button
                emphasis="quiet"
                size="compact"
                onClick={() => setPlayNonce((n) => n + 1)}
              >
                Replay
              </Button>
            </div>
          </div>

          {/* RIGHT PANE: Recessed Connected Taste Inspector */}
          <aside className="cc-studio-inspector" aria-label={drawerHeading}>
            <div className="cc-inspector-head">
              <Text variant="body">{drawerHeading}</Text>
              <Text variant="meta">{drawerSub}</Text>
            </div>

            <div className="cc-inspector-list">
              {act === "roast" ? (
                <>
                  {roastConfirmed ? (
                    <div className="cc-ledger-bean" data-active="true">
                      <Inline justify="between" align="center" gap={6}>
                        <Status tone="success">Roasted just now</Status>
                        <Text variant="meta">#communication</Text>
                      </Inline>
                      <Heading level={4}>
                        Lead with the hard truth, not the build-up
                      </Heading>
                      <Text variant="help">
                        Upfront trust and clarity over softening the moment.
                      </Text>
                    </div>
                  ) : null}
                  <div className="cc-ledger-bean" data-active="false">
                    <Inline justify="between" align="center" gap={6}>
                      <Text variant="meta">Confirmed · Private</Text>
                      <Text variant="meta">#hiring</Text>
                    </Inline>
                    <Heading level={4}>{BREW_BEANS[0].title}</Heading>
                    <Text variant="help">{BREW_BEANS[0].tradeoff}</Text>
                  </div>
                </>
              ) : (
                (act === "brew" ? BREW_BEANS : activeGuest.beans).map(
                  (bean, idx) => {
                    const isBeanActive =
                      act === "brew"
                        ? (brewMode === "growth" && idx === 0) ||
                          (brewMode === "craft" && idx === 1)
                        : idx === 0;
                    const isClickable = act === "brew";
                    return (
                      <button
                        key={bean.id}
                        type="button"
                        className="cc-ledger-bean"
                        data-active={isBeanActive}
                        data-clickable={isClickable}
                        disabled={!isClickable}
                        onClick={() => {
                          if (act === "brew") {
                            setBrewMode(idx === 0 ? "growth" : "craft");
                          }
                        }}
                      >
                        <Inline justify="between" align="center" gap={6}>
                          <Text variant="meta">{bean.label}</Text>
                          <Text variant="meta">{bean.tag}</Text>
                        </Inline>
                        <Heading level={4}>{bean.title}</Heading>
                        <Text variant="help">{bean.tradeoff}</Text>
                        <Text variant="meta">Except: {bean.boundary}</Text>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* 3. ASYMMETRIC EDITORIAL MANIFESTO (Why Coffee Chat) */}
      <section className="cc-manifesto" aria-label="Why Coffee Chat">
        <Stack gap={16}>
          <span className="cc-section-index">Why Coffee Chat</span>
          <Heading level={2} className="cc-manifesto-title">
            Nothing is unimportant.
            <br />
            Taste is <em className="cc-accent-ink">what you put first.</em>
          </Heading>
          <Text as="p" className="cc-hero-lead">
            Everyone agrees speed, quality, honesty, and caution all matter. In
            real work, good things collide—and what decides the call is{" "}
            <strong>which one wins</strong> and{" "}
            <strong>when the rule flips</strong>. We save links and notes
            everywhere, but nothing organizes our priority order.
          </Text>
        </Stack>

        <div className="cc-manifesto-list">
          <div className="cc-manifesto-row">
            <span className="cc-manifesto-num">01</span>
            <Stack gap={6}>
              <Heading level={3}>Why a Coffee Chat here actually works</Heading>
              <Text as="p" variant="help">
                You don’t grab coffee with someone for textbook advice—you want
                to know what they put first when good options clash. Their
                confirmed Beans let your AI apply their real priorities to your
                situation, never roleplayed.
              </Text>
            </Stack>
          </div>

          <div className="cc-manifesto-row">
            <span className="cc-manifesto-num">02</span>
            <Stack gap={6}>
              <Heading level={3}>Why your AI stops saying “it depends”</Heading>
              <Text as="p" variant="help">
                Models treat every principle as equally valid. Once you Roast
                your priority order into private Beans, your AI stops hedging
                and commits to what you actually optimize for.
              </Text>
            </Stack>
          </div>

          <div className="cc-manifesto-row">
            <span className="cc-manifesto-num">03</span>
            <Stack gap={6}>
              <Heading level={3}>Confirmed by you, zero server AI</Heading>
              <Text as="p" variant="help">
                Nothing saves without your confirmation, and Coffee Chat runs no
                models of its own. Everything stays private by default and brews
                straight inside your AI.
              </Text>
            </Stack>
          </div>
        </div>
      </section>

      {/* 4. UNIFIED COMPARISON SPREAD (On the Table right now) */}
      <section className="cc-spread-section" aria-label="On the Table right now">
        {totalCorpusPublicCount > 0 && featuredTable ? (
          <>
            <Inline justify="between" align="end" gap={16} wrap>
              <Stack gap={6}>
                <span className="cc-section-index">On the Table right now</span>
                <Heading level={2}>Same essay. Opposite Roasts.</Heading>
                <Text variant="help">
                  {featuredTable.sourceTitle ?? featuredTable.normalizedUrl}
                </Text>
              </Stack>
              <ButtonGroup label="Table navigation">
                <Link
                  href={`/sources/${featuredTable.originId}`}
                  emphasis="soft"
                  size="compact"
                >
                  Open this Table
                </Link>
                <Link href="/sources" emphasis="quiet" size="compact">
                  Browse all Tables
                </Link>
              </ButtonGroup>
            </Inline>

            <div className="cc-spread">
              {contrastingPreview.map((b) => (
                <article key={b.id} className="cc-spread-col">
                  <Inline justify="between" align="center" gap={8} wrap>
                    <Inline gap={8} align="center">
                      <Avatar label={b.ownerDisplayName} size="compact" />
                      <Link
                        href={`/@${b.ownerHandle}`}
                        className="person-inline-link"
                      >
                        <Text variant="body">{b.ownerDisplayName}</Text>
                        <Text variant="meta">@{b.ownerHandle}</Text>
                      </Link>
                    </Inline>
                    <Link
                      href={`/@${b.ownerHandle}`}
                      emphasis="soft"
                      size="compact"
                    >
                      Coffee Chat
                    </Link>
                  </Inline>

                  <Heading level={3}>{b.title}</Heading>

                  <div className="cc-criteria-grid">
                    <Stack gap={4}>
                      <Text variant="meta">What mattered more</Text>
                      <Text as="p" variant="body">
                        {b.tradeoff}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text variant="meta">Except when</Text>
                      <Text as="p" variant="help">
                        {b.boundary}
                      </Text>
                    </Stack>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <Card
            title="Start the first Coffee Chat Table"
            description="No public Beans yet — start in your AI or privately in My Roastery, and share one whenever you want contrasting takes"
            variant="raised"
            density="regular"
            action={
              <ButtonGroup label="Get started actions">
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
                <Link href="/connect" emphasis="soft" size="compact">
                  Manual setup
                </Link>
              </ButtonGroup>
            }
          >
            <Stack gap={8}>
              <Inline gap={8} align="center">
                <Badge tone="neutral" dot={false}>
                  Private by default
                </Badge>
              </Inline>
              <Text variant="help">
                Every Bean starts private to you and your connected AI. Share
                only the priority calls you explicitly choose to put On the
                Table.
              </Text>
            </Stack>
          </Card>
        )}
      </section>
    </div>
  );
}
