"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { ProjectMark } from "@openboa/yogurt/project-mark";
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

  // Universal Hero Copy-and-Start CTA state (works regardless of which AI app the visitor uses)
  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

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

  const universalStartPrompt = `Connect to Coffee Chat at ${mcpUrl} (sign in when prompted). Once connected, help me Roast my first private Bean from a real decision or article I share with you—ask what mattered more and when the rule stops applying, and wait for my confirmation before saving.`;

  const handleCopyStartPrompt = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(universalStartPrompt);
      }
    } catch {
      // Clipboard may be unavailable in restricted contexts; still reveal preview so user can copy manually.
    }
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
  const topCurveState = isDecaf
    ? "dim"
    : act === "brew"
      ? brewMode === "growth"
        ? curveDrawn
          ? "drawn"
          : "idle"
        : "dim"
      : curveDrawn
        ? "drawn"
        : "idle";

  const bottomCurveState = isDecaf
    ? "dim"
    : act === "brew" && brewMode === "craft"
      ? curveDrawn
        ? "drawn"
        : "idle"
      : "dim";

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
      ? `${activeGuest.fullName} (${activeGuest.handle})`
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
        ? "Try Growth Roast or Specialist Roast above"
        : "Try Unplugged (Decaf) or Specialist Roast above"
      : act === "roast"
        ? roastConfirmed
          ? "Saved privately · ready across your AI apps"
          : "Nothing saves until you confirm"
        : `Switch to ${guest === "claire" ? "@david" : "@claire"} above`;

  return (
    <Stack gap={48}>
      {/* 1. HERO: CRYSTAL-CLEAR POSITIONING + UNIVERSAL COPY-TO-AI CTA */}
      <section className="hero-section">
        <Stack gap={16}>
          <div className="hero-eyebrow">
            <ProjectMark project="coffee" size={24} />
            <span>
              Personal Taste plugin for ChatGPT, Claude, Codex, Cursor &amp;
              Antigravity
            </span>
          </div>

          <h1 className="hero-headline">
            Your AI knows everything.
            <br />
            Give it your Taste.
          </h1>

          <p className="hero-subline">
            Save how you weigh real trade-offs—so your AI answers with your
            priorities, or lets you Coffee Chat with anyone else’s.
          </p>

          <Stack gap={12}>
            <Inline gap={12} align="center" wrap>
              <Button
                emphasis="filled"
                tone="brand"
                size="comfortable"
                onClick={() => void handleCopyStartPrompt()}
              >
                {copiedHeroPrompt
                  ? "Copied — paste into any AI ✓"
                  : "Copy prompt to start in your AI"}
              </Button>
              <Button
                emphasis="soft"
                size="comfortable"
                onClick={() =>
                  router.push(
                    signedIn
                      ? "/me?compose=1"
                      : "/signin?returnTo=%2Fme%3Fcompose%3D1",
                  )
                }
              >
                {signedIn ? "Open My Roastery" : "Try in browser"}
              </Button>
              <Link href="/connect">Manual setup →</Link>
            </Inline>

            <Inline gap={12} align="center" wrap>
              <span className="stage-caption">
                Paste into whatever AI you already use — no config file needed
                to start.
              </span>
              <Button
                emphasis="quiet"
                size="compact"
                onClick={() => setShowPromptPreview((v) => !v)}
              >
                {showPromptPreview ? "Hide prompt" : "Preview prompt"}
              </Button>
            </Inline>

            {showPromptPreview ? (
              <div className="hero-prompt-preview">{universalStartPrompt}</div>
            ) : null}
          </Stack>
        </Stack>
      </section>

      {/* 2. FLAT, READABLE 3-ACT LIVE STAGE (NO BOX-IN-BOX NESTING, NO ALL-CAPS SHOUTING) */}
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

        <div className="stage-canvas-grid">
          {/* LEFT: CLEAN AI CONVERSATION WINDOW (directly on neutral stage) */}
          <div className="stage-agent-window">
            <div className="stage-agent-chrome">
              <Inline gap={8} align="center">
                <ProjectMark project="coffee" size={18} />
                <Text variant="meta">Your AI · Any connected chat</Text>
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

              {/* Quiet sentence-case plugin trace */}
              <div className="stage-unfold" data-open={traceOpen}>
                <div className="stage-unfold-inner">
                  <div className="stage-trace-line">
                    <ProjectMark project="coffee" size={16} />
                    <span>{traceLabel}</span>
                  </div>
                </div>
              </div>

              {/* Clean reply directly on canvas — NO nested bordered box! */}
              <div className="stage-unfold" data-open={responseOpen}>
                <div className="stage-unfold-inner">
                  {act === "roast" ? (
                    <div className="stage-confirm-card">
                      <Stack gap={12}>
                        <Inline justify="between" align="center" gap={8}>
                          <Text variant="meta">
                            Confirm Bean · Private by default
                          </Text>
                          <Badge
                            tone={roastConfirmed ? "success" : "neutral"}
                            dot={false}
                          >
                            {roastConfirmed ? "Saved" : "Draft"}
                          </Badge>
                        </Inline>
                        <Heading level={3}>
                          Lead with the hard truth, not the build-up
                        </Heading>
                        <div className="bean-pull">
                          <Stack gap={2}>
                            <Text variant="meta">What mattered more</Text>
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
                          <span className="stage-caption">
                            Never saved silently
                          </span>
                        </Inline>
                      </Stack>
                    </div>
                  ) : (
                    <div
                      className="stage-reply"
                      data-mode={isDecaf ? "decaf" : "brewed"}
                    >
                      <Heading
                        level={3}
                        className={isDecaf ? "stage-decaf-strike" : undefined}
                      >
                        {isDecaf
                          ? "“Both candidates have strong pros and cons depending on your goals…”"
                          : act === "brew"
                            ? brewMode === "growth"
                              ? "Hire the fast-learning generalist—unless certification is required today."
                              : "Hire the proven specialist—your deadline leaves no room for ramp-up."
                            : activeGuest.headline}
                      </Heading>

                      <p className="stage-reply-body">{streamedText}</p>

                      {!isDecaf ? (
                        <div
                          className="stage-reveal"
                          data-visible={citeVisible}
                        >
                          <span className="stage-caption">
                            {act === "brew"
                              ? brewMode === "growth"
                                ? "Guided by your Growth Roast Bean · Boundary verified"
                                : "Guided by your Specialist Roast Bean · Boundary verified"
                              : activeGuest.cite}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="stage-agent-footer">
              <span className="stage-caption">{composerHint}</span>
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
              viewBox="0 0 72 320"
              width="72"
              height="320"
              style={{ overflow: "visible" }}
            >
              <path
                className="stage-signal-path"
                data-state={topCurveState}
                d="M 0 155 C 34 155, 38 96, 72 96"
              />
              <path
                className="stage-signal-path"
                data-state={bottomCurveState}
                d="M 0 155 C 34 155, 38 228, 72 228"
              />

              <circle
                r="3"
                className="stage-signal-pulse"
                data-active={
                  pulseActive &&
                  ((act === "brew" && brewMode === "growth") || act === "chat")
                }
              >
                <animateMotion
                  dur="1.8s"
                  repeatCount="indefinite"
                  path="M 72 96 C 38 96, 34 155, 0 155"
                />
              </circle>

              <circle
                r="3"
                className="stage-signal-pulse"
                data-active={
                  pulseActive && act === "brew" && brewMode === "craft"
                }
              >
                <animateMotion
                  dur="1.8s"
                  repeatCount="indefinite"
                  path="M 72 228 C 38 228, 34 155, 0 155"
                />
              </circle>

              <circle
                r="3"
                className="stage-signal-pulse"
                data-active={pulseActive && act === "roast"}
              >
                <animateMotion
                  dur="1.4s"
                  repeatCount="indefinite"
                  path="M 0 155 C 34 155, 38 96, 72 96"
                />
              </circle>
            </svg>
          </div>

          {/* RIGHT: FLOATING BEAN CARDS (NO OUTER DASHED BOX PRISON!) */}
          <div className="stage-bean-column">
            <Inline justify="between" align="center" gap={8}>
              <Text variant="body">{drawerHeading}</Text>
              <Text variant="meta">{drawerSub}</Text>
            </Inline>

            {act === "roast" ? (
              <Stack gap={12}>
                <div className="stage-unfold" data-open={roastConfirmed}>
                  <div className="stage-unfold-inner">
                    <div
                      className="stage-bean-card"
                      data-active={roastConfirmed}
                    >
                      <span className="stage-bean-rail" aria-hidden="true" />
                      <Stack gap={6}>
                        <Inline justify="between" align="center" gap={6}>
                          <Text variant="meta">Roasted just now</Text>
                          <Badge tone="neutral" dot={false}>
                            #communication
                          </Badge>
                        </Inline>
                        <Heading level={4}>
                          Lead with the hard truth, not the build-up
                        </Heading>
                        <Text variant="help">
                          Upfront trust and clarity over softening the moment.
                        </Text>
                      </Stack>
                    </div>
                  </div>
                </div>

                <div className="stage-bean-card" data-active={false}>
                  <span className="stage-bean-rail" aria-hidden="true" />
                  <Stack gap={6}>
                    <Inline justify="between" align="center" gap={6}>
                      <Text variant="meta">Confirmed · Private</Text>
                      <Badge tone="neutral" dot={false}>
                        #hiring
                      </Badge>
                    </Inline>
                    <Heading level={4}>{BREW_BEANS[0].title}</Heading>
                    <Text variant="help">{BREW_BEANS[0].tradeoff}</Text>
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
                        <span className="stage-bean-rail" aria-hidden="true" />
                        <Stack gap={6}>
                          <Inline justify="between" align="center" gap={6}>
                            <Text variant="meta">{bean.label}</Text>
                            <Badge tone="neutral" dot={false}>
                              {bean.tag}
                            </Badge>
                          </Inline>
                          <Heading level={4}>{bean.title}</Heading>
                          <Text variant="help">{bean.tradeoff}</Text>
                          <Text variant="meta">Except: {bean.boundary}</Text>
                        </Stack>
                      </div>
                    );
                  },
                )}
              </Stack>
            )}
          </div>
        </div>
      </Stack>

      {/* 3. WHY COFFEE CHAT EXISTS — CRISP, HUMAN, DIRECTLY BELOW USE CASES */}
      <section className="why-section">
        <Stack gap={24}>
          <Stack gap={12}>
            <span className="section-kicker">Why Coffee Chat</span>
            <h2 className="why-headline">
              Nothing is unimportant.
              <br />
              Taste is what you put first.
            </h2>
            <p className="hero-subline">
              Everyone agrees speed, quality, honesty, and caution all matter.
              In real work, good things collide—and what decides the call is{" "}
              <strong>which one wins</strong> and{" "}
              <strong>when the rule flips</strong>. We save links and notes
              everywhere, but nothing organizes our priority order.
            </p>
          </Stack>

          <div className="steps-grid">
            <Stack gap={8}>
              <Heading level={3}>
                Why a Coffee Chat here actually works
              </Heading>
              <Text as="p" variant="help">
                You don’t grab coffee with someone for textbook advice—you want
                to know what they put first when good options clash. Their
                confirmed Beans let your AI apply their real priorities to your
                situation, never roleplayed.
              </Text>
            </Stack>

            <Stack gap={8}>
              <Heading level={3}>
                Why your AI stops saying “it depends”
              </Heading>
              <Text as="p" variant="help">
                Models treat every principle as equally valid. Once you Roast
                your priority order into private Beans, your AI stops hedging
                and commits to what you actually optimize for.
              </Text>
            </Stack>

            <Stack gap={8}>
              <Heading level={3}>Confirmed by you, zero server AI</Heading>
              <Text as="p" variant="help">
                Nothing saves without your confirmation, and Coffee Chat runs no
                models of its own. Everything stays private by default and brews
                straight inside your AI.
              </Text>
            </Stack>
          </div>
        </Stack>
      </section>

      {/* 4. SECONDARY BOTTOM SHOWCASE: Real Table preview (low priority, after value & why) */}
      {totalCorpusPublicCount > 0 && featuredTable ? (
        <Stack gap={16}>
          <Inline justify="between" align="baseline" gap={12} wrap>
            <Stack gap={4}>
              <span className="section-kicker">On the Table right now</span>
              <Heading level={2}>Same essay. Opposite Roasts.</Heading>
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
          description="No public Beans yet — start in your AI or privately in My Roastery, and share one whenever you want contrasting takes"
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
                Manual setup
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
