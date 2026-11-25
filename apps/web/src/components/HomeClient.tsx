"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { CopyButton } from "@openboa/yogurt/motion-copy-button";
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
type InstallHost = "chatgpt" | "claude" | "codex" | "cursor" | "antigravity";

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
    boundary: "Roles requiring day-one regulatory certification.",
    tag: "#hiring",
  },
  {
    id: "craft",
    label: "Specialist Roast · Work",
    title: "Pick proven craft when the deadline won’t move",
    tradeoff: "Immediate execution quality over long-term versatility.",
    boundary: "Ambiguous roles where the scope changes every month.",
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
      "Have a Coffee Chat with @claire—should we polish our new release another month, or show a rough version to 10 customers this week?",
    headline:
      "Based on @claire’s Beans, show an honest draft to 10 people this week.",
    body: "@claire puts real customer signal ahead of upfront polish—polishing the wrong workflow wastes a month. Share a clearly labeled early version with 10 people now, as long as nothing is irreversible.",
    cite: "Source: @claire’s Bean · Boundary: reversible bets only",
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
        tradeoff: "Momentum together over clean separate tracks.",
        boundary: "Regulated teams needing strict separation.",
        tag: "#teams",
      },
    ],
  },
  david: {
    fullName: "David Chen",
    handle: "@david",
    prompt:
      "Have a Coffee Chat with @david—should we polish our new release another month, or show a rough version to 10 customers this week?",
    headline:
      "Based on @david’s Beans, ship rough only if zero money or private data is touched.",
    body: "@david puts durable customer trust ahead of early demo speed. People forgive a rough layout, never a billing or privacy slip—only test early if you keep it strictly on sample data until trust paths are airtight.",
    cite: "Source: @david’s Bean · Boundary: prototypes with sample data",
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
  const [installHost, setInstallHost] = useState<InstallHost>("chatgpt");
  const [playNonce, setPlayNonce] = useState(0);

  // Sequenced motion phase state (respects reduced motion cleanly)
  const [promptVisible, setPromptVisible] = useState(true);
  const [traceOpen, setTraceOpen] = useState(true);
  const [curveDrawn, setCurveDrawn] = useState(true);
  const [pulseActive, setPulseActive] = useState(true);
  const [responseOpen, setResponseOpen] = useState(true);
  const [streamedText, setStreamedText] = useState("");
  const [citeVisible, setCiteVisible] = useState(true);
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

  const getActiveResponseText = useCallback((): string => {
    if (act === "brew") {
      if (brewMode === "decaf") {
        return "Generalists offer flexibility and long-term growth, while specialists bring immediate domain knowledge. Consider your team’s current needs and timeline before deciding.";
      }
      if (brewMode === "growth") {
        return "Per your confirmed Bean, ownership and learning speed outrank prior industry playbooks. Give the generalist a clear 30-day ramp—and only flip to the specialist if regulatory certification is mandatory on day one.";
      }
      return "Per your confirmed Bean, immediate execution quality beats versatility when the launch date is fixed. Pick the specialist as long as the role’s core scope is already well defined.";
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
      setPromptVisible(true);
      setTraceOpen(act !== "brew" || brewMode !== "decaf");
      setCurveDrawn(act !== "brew" || brewMode !== "decaf");
      setPulseActive(false);
      setResponseOpen(true);
      setStreamedText(fullText);
      setCiteVisible(true);
      setRoastConfirmed(act === "roast");
      return clearTimers;
    }

    setPromptVisible(false);
    setTraceOpen(false);
    setCurveDrawn(false);
    setPulseActive(false);
    setResponseOpen(false);
    setStreamedText("");
    setCiteVisible(false);
    setRoastConfirmed(false);

    schedule(40, () => setPromptVisible(true));

    if (act === "brew" && brewMode === "decaf") {
      schedule(180, () => {
        setResponseOpen(true);
        const words = fullText.split(" ");
        let idx = 0;
        const step = () => {
          if (idx < words.length) {
            idx += 1;
            setStreamedText(words.slice(0, idx).join(" "));
            schedule(22, step);
          } else {
            setCiteVisible(true);
          }
        };
        step();
      });
      return clearTimers;
    }

    if (act === "roast") {
      schedule(180, () => setTraceOpen(true));
      schedule(340, () => setResponseOpen(true));
      schedule(1200, () => {
        setRoastConfirmed(true);
        setCurveDrawn(true);
        schedule(220, () => setPulseActive(true));
      });
      return clearTimers;
    }

    // Act 01 (Brew active) or Act 03 (Coffee Chat with other Taste)
    schedule(160, () => {
      setTraceOpen(true);
      setCurveDrawn(true);
    });
    schedule(360, () => setPulseActive(true));
    schedule(420, () => {
      setResponseOpen(true);
      const words = fullText.split(" ");
      let idx = 0;
      const step = () => {
        if (idx < words.length) {
          idx += 1;
          setStreamedText(words.slice(0, idx).join(" "));
          schedule(20, step);
        } else {
          setCiteVisible(true);
        }
      };
      step();
    });

    return clearTimers;
  }, [act, brewMode, guest, playNonce, clearTimers, schedule, getActiveResponseText]);

  const installCommands: Record<InstallHost, string> = {
    chatgpt: `Settings → Apps & Connectors → Add URL: ${mcpUrl}`,
    claude: `claude mcp add --transport http coffee-chat "${mcpUrl}"`,
    codex: `[mcp_servers.coffee_chat] url = "${mcpUrl}"`,
    cursor: `{ "mcpServers": { "coffee-chat": { "url": "${mcpUrl}" } } }`,
    antigravity: `{ "mcpServers": { "coffee-chat": { "url": "${mcpUrl}" } } }`,
  };

  const copyText = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const contrastingPreview = (() => {
    if (!featuredTable) return [];
    const ordered = [...featuredTable.beans].sort(
      (a, b) => Number(Boolean(a.supersededByBeanId)) - Number(Boolean(b.supersededByBeanId)),
    );
    const seen = new Set<string>();
    const distinct = ordered.filter((b) => {
      if (seen.has(b.ownerHandle)) return false;
      seen.add(b.ownerHandle);
      return true;
    });
    return distinct.length >= 2
      ? distinct.slice(0, 2)
      : ordered.slice(0, 2);
  })();

  // Derived stage values
  const isDecaf = act === "brew" && brewMode === "decaf";
  const topCurveState =
    isDecaf
      ? "dim"
      : act === "brew"
        ? brewMode === "growth"
          ? curveDrawn
            ? "drawn"
            : "idle"
          : "dim"
        : act === "roast"
          ? curveDrawn
            ? "drawn"
            : "idle"
          : curveDrawn
            ? "drawn"
            : "idle";

  const bottomCurveState =
    isDecaf
      ? "dim"
      : act === "brew" && brewMode === "craft"
        ? curveDrawn
          ? "drawn"
          : "idle"
        : "dim";

  const activeGuest = CHAT_GUEST_DATA[guest];

  const promptText =
    act === "brew"
      ? "Two finalists for a key role: a sharp generalist who learns fast, or a proven specialist with our exact background. Who should we pick?"
      : act === "roast"
        ? "No—don’t bury the missed target on slide 4. Put the honest status and our fix in the very first sentence."
        : activeGuest.prompt;

  const traceLabel =
    act === "brew"
      ? brewMode === "growth"
        ? 'coffee-chat · applied your Bean "Hire fast learners over ready-made playbooks"'
        : 'coffee-chat · applied your Bean "Pick proven craft when the deadline won’t move"'
      : act === "roast"
        ? "coffee-chat · drafted a private Bean for your confirmation"
        : `coffee-chat · pulled ${activeGuest.handle}’s confirmed public Beans (attributed, never roleplay)`;

  const pluginChipLabel = isDecaf
    ? "unplugged"
    : act === "brew"
      ? "coffee-chat · active"
      : act === "roast"
        ? roastConfirmed
          ? "coffee-chat · roasted"
          : "coffee-chat · draft"
        : `coffee-chat · ${activeGuest.handle}`;

  const drawerTitle =
    act === "chat"
      ? `${activeGuest.fullName} (${activeGuest.handle})`
      : "Your Roastery";
  const drawerCount =
    act === "roast"
      ? roastConfirmed
        ? "5 Beans"
        : "4 Beans"
      : act === "chat"
        ? "Public Taste"
        : "Private Beans";

  const composerHint =
    act === "brew"
      ? isDecaf
        ? "Try Growth Roast or Specialist Roast above"
        : "Try Unplugged (Decaf) or Specialist Roast above"
      : act === "roast"
        ? roastConfirmed
          ? "Saved privately · ready across your AI apps"
          : "Waiting for your confirmation…"
        : `Switch to ${guest === "claire" ? "@david" : "@claire"} above`;

  return (
    <Stack gap={48}>
      {/* 1. HERO: FINAL EXPERIENCE OUTCOME FIRST (100% English, one breath) */}
      <section className="hero-section">
        <Stack gap={16}>
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" aria-hidden="true" />
            <span>
              Plugin for ChatGPT · Claude · Codex · Cursor · Antigravity
            </span>
          </div>

          <h1 className="hero-headline">
            Give your AI your Taste.
            <br />
            Coffee Chat with other Taste.
          </h1>

          <p className="hero-subline">
            Your Taste inside your AI—or anyone else’s, one prompt away.
          </p>

          <Inline gap={12} align="center" wrap>
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
              Connect your AI
            </Button>
            {signedIn ? (
              <Link href="/me">Open My Roastery →</Link>
            ) : null}
          </Inline>
        </Stack>
      </section>

      {/* 2. LIVE CHOREOGRAPHED 3-ACT AGENT STAGE (01 Brew -> 02 Roast -> 03 Coffee Chat with other Taste) */}
      <Stack gap={16}>
        <div className="stage-act-bar">
          <div
            className="stage-act-tabs"
            role="tablist"
            aria-label="Coffee Chat use cases"
          >
            <button
              type="button"
              role="tab"
              aria-selected={act === "brew"}
              data-active={act === "brew"}
              className="stage-act-tab"
              onClick={() => setAct("brew")}
            >
              01 · Brew in your AI
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={act === "roast"}
              data-active={act === "roast"}
              className="stage-act-tab"
              onClick={() => setAct("roast")}
            >
              02 · Roast from a correction
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={act === "chat"}
              data-active={act === "chat"}
              className="stage-act-tab"
              onClick={() => setAct("chat")}
            >
              03 · Coffee Chat with other Taste
            </button>
          </div>

          {act === "brew" ? (
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
          ) : act === "chat" ? (
            <SegmentedControl
              label="Choose someone to Coffee Chat with"
              value={guest}
              onValueChange={(v) => setGuest(v as ChatGuest)}
              options={[
                { id: "claire", label: "Coffee Chat with @claire" },
                { id: "david", label: "Coffee Chat with @david" },
              ]}
            />
          ) : null}
        </div>

        <Card variant="raised" density="regular">
          <div className="stage-canvas-grid">
            {/* LEFT: YOUR AI WINDOW */}
            <div className="stage-agent-window">
              <div className="stage-agent-chrome">
                <Inline gap={8} align="center">
                  <span className="stage-window-dots" aria-hidden="true">
                    <span className="stage-window-dot" />
                    <span className="stage-window-dot" />
                    <span className="stage-window-dot" />
                  </span>
                  <span className="mono-meta">
                    your AI · chatgpt / claude / codex / cursor
                  </span>
                </Inline>
                <Badge tone={isDecaf ? "neutral" : "brand"} dot={false}>
                  {pluginChipLabel}
                </Badge>
              </div>

              <div className="stage-agent-body">
                <div className="stage-prompt-row">
                  <div
                    className="stage-prompt-bubble stage-reveal"
                    data-visible={promptVisible}
                  >
                    {promptText}
                  </div>
                </div>

                {/* Inline MCP Plugin Trace */}
                <div className="stage-unfold" data-open={traceOpen}>
                  <div className="stage-unfold-inner">
                    <span className="mono-meta">{traceLabel}</span>
                  </div>
                </div>

                {/* Final Answer or Inline Confirm Card */}
                <div className="stage-unfold" data-open={responseOpen}>
                  <div className="stage-unfold-inner">
                    {act === "roast" ? (
                      <div className="stage-response-box">
                        <Stack gap={12}>
                          <Inline justify="between" align="center" gap={8}>
                            <span className="mono-meta">
                              Inline Confirm Bean · Private by default
                            </span>
                            <span className="mono-meta">
                              {roastConfirmed ? "Saved" : "Nothing saved yet"}
                            </span>
                          </Inline>
                          <Heading level={3}>
                            Lead with the hard truth, not the build-up
                          </Heading>
                          <div className="bean-pull">
                            <Stack gap={2}>
                              <span className="mono-meta">
                                What mattered more
                              </span>
                              <Text as="p" variant="body">
                                Upfront trust and clarity over softening the
                                moment.
                              </Text>
                            </Stack>
                          </div>
                          <p className="bean-footnote">
                            Except when: External announcements needing legal
                            review first.
                          </p>
                          <Divider />
                          <Inline justify="between" align="center" gap={8}>
                            <Button
                              emphasis={roastConfirmed ? "soft" : "filled"}
                              tone="neutral"
                              size="compact"
                              onClick={() => {
                                setRoastConfirmed(true);
                                setCurveDrawn(true);
                                setPulseActive(true);
                              }}
                            >
                              {roastConfirmed
                                ? "Roasted into Roastery ✓"
                                : "Confirm & Roast"}
                            </Button>
                            <span className="mono-meta">
                              Never saved silently
                            </span>
                          </Inline>
                        </Stack>
                      </div>
                    ) : (
                      <div
                        className="stage-response-box"
                        data-mode={isDecaf ? "decaf" : "brewed"}
                      >
                        <Stack gap={12}>
                          <Inline justify="between" align="center" gap={8}>
                            <span className="mono-meta">
                              {isDecaf
                                ? "Unbrewed · Generic Decaf AI"
                                : act === "brew"
                                  ? brewMode === "growth"
                                    ? "Brewed · Your Growth Roast"
                                    : "Brewed · Your Specialist Roast"
                                  : `Coffee Chat · ${activeGuest.fullName}’s Confirmed Taste`}
                            </span>
                            {!isDecaf ? (
                              <Badge tone="brand" dot={false}>
                                {act === "chat"
                                  ? "Attributed"
                                  : "Boundary verified"}
                              </Badge>
                            ) : null}
                          </Inline>

                          <Heading
                            level={3}
                            className={isDecaf ? "stage-decaf-strike" : undefined}
                          >
                            {isDecaf
                              ? "“Both candidates have strong pros and cons depending on your goals…”"
                              : act === "brew"
                                ? brewMode === "growth"
                                  ? "Hire the fast-learning generalist—unless compliance requires credentials today."
                                  : "Hire the proven specialist—your deadline leaves no room for ramp-up."
                                : activeGuest.headline}
                          </Heading>

                          <Text as="p" variant="help">
                            {streamedText}
                          </Text>

                          {!isDecaf ? (
                            <div
                              className="stage-reveal"
                              data-visible={citeVisible}
                            >
                              <Stack gap={8}>
                                <Divider />
                                <Inline
                                  justify="between"
                                  align="center"
                                  gap={8}
                                  wrap
                                >
                                  <span className="mono-meta">
                                    {act === "brew"
                                      ? brewMode === "growth"
                                        ? "Guided by: Your Growth Roast Bean"
                                        : "Guided by: Your Specialist Roast Bean"
                                      : activeGuest.cite}
                                  </span>
                                  <span className="mono-meta">
                                    {act === "chat"
                                      ? "Zero impersonation"
                                      : "Same AI · Your priority order"}
                                  </span>
                                </Inline>
                              </Stack>
                            </div>
                          ) : null}
                        </Stack>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="stage-agent-footer">
                <span className="mono-meta">{composerHint}</span>
                <Button
                  emphasis="quiet"
                  size="compact"
                  onClick={() => setPlayNonce((n) => n + 1)}
                >
                  Replay ↺
                </Button>
              </div>
            </div>

            {/* CENTER: PRECISION SVG BEZIER SIGNAL */}
            <div className="stage-bridge-col" aria-hidden="true">
              <svg
                viewBox="0 0 72 340"
                width="72"
                height="340"
                style={{ overflow: "visible" }}
              >
                <path
                  className="stage-signal-path"
                  data-state={topCurveState}
                  d="M 0 155 C 34 155, 38 92, 72 92"
                />
                <path
                  className="stage-signal-path"
                  data-state={bottomCurveState}
                  d="M 0 155 C 34 155, 38 232, 72 232"
                />

                <circle
                  r="2.75"
                  className="stage-signal-pulse"
                  data-active={
                    pulseActive &&
                    ((act === "brew" && brewMode === "growth") ||
                      act === "chat")
                  }
                >
                  <animateMotion
                    dur="1.8s"
                    repeatCount="indefinite"
                    path="M 72 92 C 38 92, 34 155, 0 155"
                  />
                </circle>

                <circle
                  r="2.75"
                  className="stage-signal-pulse"
                  data-active={
                    pulseActive && act === "brew" && brewMode === "craft"
                  }
                >
                  <animateMotion
                    dur="1.8s"
                    repeatCount="indefinite"
                    path="M 72 232 C 38 232, 34 155, 0 155"
                  />
                </circle>

                <circle
                  r="2.75"
                  className="stage-signal-pulse"
                  data-active={pulseActive && act === "roast"}
                >
                  <animateMotion
                    dur="1.4s"
                    repeatCount="indefinite"
                    path="M 0 155 C 34 155, 38 92, 72 92"
                  />
                </circle>
              </svg>
            </div>

            {/* RIGHT: DOCKED COFFEE CHAT ROASTERY / SHELF PANEL */}
            <div className="stage-drawer">
              <Stack gap={12}>
                <Inline justify="between" align="center" gap={8}>
                  <span className="mono-meta">{drawerTitle}</span>
                  <span className="mono-meta">{drawerCount}</span>
                </Inline>

                <Divider />

                {act === "roast" ? (
                  <Stack gap={12}>
                    <div className="stage-unfold" data-open={roastConfirmed}>
                      <div className="stage-unfold-inner">
                        <div
                          className="stage-bean-card"
                          data-active={roastConfirmed}
                        >
                          <span className="stage-bean-rail" aria-hidden="true" />
                          <Stack gap={4}>
                            <Inline justify="between" align="center" gap={6}>
                              <span className="mono-meta">
                                Roasted Just Now · Private
                              </span>
                              <span className="mono-meta">#communication</span>
                            </Inline>
                            <Text variant="body">
                              Lead with the hard truth, not the build-up
                            </Text>
                            <Text variant="meta">
                              Upfront trust and clarity over softening the
                              moment.
                            </Text>
                          </Stack>
                        </div>
                      </div>
                    </div>

                    <div className="stage-bean-card" data-active={false}>
                      <span className="stage-bean-rail" aria-hidden="true" />
                      <Stack gap={4}>
                        <Inline justify="between" align="center" gap={6}>
                          <span className="mono-meta">Confirmed · Private</span>
                          <span className="mono-meta">#hiring</span>
                        </Inline>
                        <Text variant="body">{BREW_BEANS[0].title}</Text>
                        <Text variant="meta">{BREW_BEANS[0].tradeoff}</Text>
                      </Stack>
                    </div>
                  </Stack>
                ) : (
                  <Stack gap={12}>
                    {(act === "brew" ? BREW_BEANS : activeGuest.beans).map(
                      (bean, idx) => {
                        const isCardActive =
                          act === "brew"
                            ? (brewMode === "growth" && idx === 0 && pulseActive) ||
                              (brewMode === "craft" && idx === 1 && pulseActive)
                            : idx === 0 && pulseActive;
                        return (
                          <div
                            key={bean.id}
                            className="stage-bean-card"
                            data-active={isCardActive}
                          >
                            <span
                              className="stage-bean-rail"
                              aria-hidden="true"
                            />
                            <Stack gap={4}>
                              <Inline justify="between" align="center" gap={6}>
                                <span className="mono-meta">{bean.label}</span>
                                <span className="mono-meta">{bean.tag}</span>
                              </Inline>
                              <Text variant="body">{bean.title}</Text>
                              <Text variant="meta">{bean.tradeoff}</Text>
                              <Text variant="meta">Except: {bean.boundary}</Text>
                            </Stack>
                          </div>
                        );
                      },
                    )}
                  </Stack>
                )}
              </Stack>

              <Stack gap={8}>
                <Divider />
                <Inline justify="between" align="center" gap={8}>
                  <span className="mono-meta">
                    {act === "chat"
                      ? "Attributed · Never impersonated"
                      : "Private by default"}
                  </span>
                  <span className="mono-meta">Zero server AI</span>
                </Inline>
              </Stack>
            </div>
          </div>
        </Card>
      </Stack>

      {/* 3. WHY COFFEE CHAT EXISTS (Directly beneath the use cases!) */}
      <section className="why-section">
        <Stack gap={32}>
          <Stack gap={12}>
            <span className="mono-meta">Why Coffee Chat</span>
            <h2 className="why-headline">
              Nothing is unimportant.
              <br />
              Taste is what you put first.
            </h2>
            <p className="hero-subline">
              Everyone agrees speed, quality, honesty, and caution all matter.
              In real work and everyday decisions, good things collide—and the
              real call is always <strong>which one wins</strong> and{" "}
              <strong>when the rule flips</strong>. We’ve had tools to save
              links and notes forever, but nothing built to organize what we
              actually prioritize.
            </p>
          </Stack>

          <div className="steps-grid">
            <Stack gap={8}>
              <Heading level={3}>
                Why a Coffee Chat here actually works
              </Heading>
              <Text as="p" variant="help">
                You don’t grab coffee with someone for textbook advice—you ask
                what they put first when good options clash. Because their Beans
                hold confirmed trade-offs and boundaries, your AI walks through
                your situation using their real priorities—attributed, never
                roleplayed.
              </Text>
            </Stack>

            <Stack gap={8}>
              <Heading level={3}>
                Why your AI stops saying “it depends”
              </Heading>
              <Text as="p" variant="help">
                Models treat every good principle as equally valid. Once you
                Roast your priority order into private Beans, your AI stops
                hedging with generic pros and cons and commits to what you
                actually value.
              </Text>
            </Stack>

            <Stack gap={8}>
              <Heading level={3}>Your priority order, never inferred</Heading>
              <Text as="p" variant="help">
                Nothing saves without your confirmation, and Coffee Chat runs
                zero server AI. Your Beans stay private by default, evolve as
                your calls change, and brew straight inside the AI you already
                use.
              </Text>
            </Stack>
          </div>

          {/* 30-second Connect Strip (Mechanism tucked cleanly after Why) */}
          <Card variant="raised" density="compact">
            <Stack gap={12}>
              <Inline justify="between" align="center" gap={12} wrap>
                <Inline gap={12} align="center" wrap>
                  <span className="mono-meta">Connect in 30s</span>
                  <SegmentedControl
                    label="Choose your AI app"
                    value={installHost}
                    onValueChange={(v) => setInstallHost(v as InstallHost)}
                    options={[
                      { id: "chatgpt", label: "ChatGPT" },
                      { id: "claude", label: "Claude" },
                      { id: "codex", label: "Codex" },
                      { id: "cursor", label: "Cursor" },
                      { id: "antigravity", label: "Antigravity" },
                    ]}
                  />
                </Inline>
                <Link href="/connect">Full Brew Bar guide →</Link>
              </Inline>

              <Inline justify="between" align="center" gap={12} wrap>
                <code className="connect-strip-code">
                  {installCommands[installHost]}
                </code>
                <CopyButton
                  value={installCommands[installHost]}
                  onCopy={copyText}
                />
              </Inline>
            </Stack>
          </Card>
        </Stack>
      </section>

      {/* 4. SECONDARY BOTTOM SHOWCASE: Community Table preview (low priority, after value & why) */}
      {totalCorpusPublicCount > 0 && featuredTable ? (
        <Stack gap={16}>
          <Inline justify="between" align="baseline" gap={12} wrap>
            <Stack gap={4}>
              <span className="mono-meta">On the Table right now</span>
              <Heading level={2}>
                Same essay. Opposite Roasts.
              </Heading>
              <Text variant="meta">
                {featuredTable.sourceTitle ?? featuredTable.normalizedUrl}
              </Text>
            </Stack>
            <Inline gap={12} align="center">
              <Link href={`/sources/${featuredTable.originId}`}>
                Open this Table →
              </Link>
              <Link href="/sources">Browse all Tables</Link>
            </Inline>
          </Inline>

          <div className="split-grid">
            {contrastingPreview.map((b) => (
              <Card key={b.id} variant="raised" density="regular">
                <Stack gap={12}>
                  <Inline justify="between" align="center" gap={8}>
                    <Inline gap={8} align="center">
                      <Avatar label={b.ownerDisplayName} size="compact" />
                      <Inline gap={6} align="baseline">
                        <Link href={`/@${b.ownerHandle}`}>
                          <Text variant="body">{b.ownerDisplayName}</Text>
                        </Link>
                        <Text variant="meta">@{b.ownerHandle}</Text>
                      </Inline>
                    </Inline>
                    <Link href={`/@${b.ownerHandle}`}>
                      Coffee Chat with @{b.ownerHandle} →
                    </Link>
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
          description="No public Beans yet — begin privately in My Roastery, and put one On the Table whenever you want to invite contrasting takes"
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
                Connect your AI
              </Button>
            </Inline>
          }
        >
          <Text variant="help">
            Every Bean starts private to you and your connected AI. Share only
            the priority calls you explicitly choose to put On the Table.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
