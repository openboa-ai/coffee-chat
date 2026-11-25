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
import { Divider } from "@openboa/yogurt/divider";
import { Grid } from "@openboa/yogurt/grid";
import { Heading } from "@openboa/yogurt/heading";
import { Icon } from "@openboa/yogurt/icon";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Message } from "@openboa/yogurt/message";
import { ProjectMark } from "@openboa/yogurt/project-mark";
import { SegmentedControl } from "@openboa/yogurt/segmented-control";
import { Stack } from "@openboa/yogurt/stack";
import { Status } from "@openboa/yogurt/status";
import { Surface } from "@openboa/yogurt/surface";
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

  // Universal Hero Copy-and-Start CTA state (works regardless of which AI app the visitor uses)
  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Live stage choreography
  const [curveDrawn, setCurveDrawn] = useState(true);
  const [pulseActive, setPulseActive] = useState(true);
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
      // Clipboard may be unavailable in restricted contexts; preview stays open for manual copy.
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
      setCurveDrawn(act !== "brew" || brewMode !== "decaf");
      setPulseActive(false);
      setStreamedText(fullText);
      setIsStreaming(false);
      setRoastConfirmed(act === "roast");
      return clearTimers;
    }

    setCurveDrawn(false);
    setPulseActive(false);
    setStreamedText("");
    setIsStreaming(act !== "roast");
    setRoastConfirmed(false);

    if (act === "brew" && brewMode === "decaf") {
      schedule(120, () => {
        const words = fullText.split(" ");
        let idx = 0;
        const step = () => {
          if (idx < words.length) {
            idx += 1;
            setStreamedText(words.slice(0, idx).join(" "));
            schedule(20, step);
          } else {
            setIsStreaming(false);
          }
        };
        step();
      });
      return clearTimers;
    }

    if (act === "roast") {
      schedule(950, () => {
        setRoastConfirmed(true);
        setCurveDrawn(true);
        schedule(200, () => setPulseActive(true));
      });
      return clearTimers;
    }

    schedule(120, () => setCurveDrawn(true));
    schedule(260, () => setPulseActive(true));
    schedule(300, () => {
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

  const actDescription =
    act === "brew"
      ? "Switch between default AI and two private Beans—same question, different call."
      : act === "roast"
        ? "Correct your AI once. It drafts a private Bean and waits for your confirmation."
        : "Consult someone else’s confirmed public Beans inside your AI—attributed, never roleplayed.";

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

  const agentGaze = isStreaming
    ? "working"
    : act === "roast" && !roastConfirmed
      ? "waiting"
      : "done";

  const renderStagePanel = () => (
    <Stack gap={16}>
      <div className="stage-toolbar">
        <Text variant="help">{actDescription}</Text>
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

      <div className="stage-grid">
        {/* LEFT: Native Yogurt Agent Conversation Card */}
        <Card
          title="Your AI"
          description="ChatGPT, Claude, Codex, Cursor, or Antigravity"
          headerAction={
            <Badge tone={isDecaf ? "neutral" : "brand"} dot={false}>
              {pluginChipLabel}
            </Badge>
          }
          action={
            <Inline
              justify="between"
              align="center"
              gap={12}
              className="stage-card-footer-row"
            >
              <Text variant="meta">{composerHint}</Text>
              <Button
                emphasis="quiet"
                size="compact"
                onClick={() => setPlayNonce((n) => n + 1)}
              >
                Replay
              </Button>
            </Inline>
          }
          variant="raised"
          density="regular"
          className="stage-conversation-card"
        >
          <Stack gap={12}>
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
              <div className="stage-trace-strip" role="status">
                <ProjectMark project="coffee" label="" size={16} />
                <Text variant="meta">{traceLabel}</Text>
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
                <Card
                  title="Confirm Bean"
                  description="Private by default — never saved silently"
                  headerAction={
                    <Badge
                      tone={roastConfirmed ? "success" : "neutral"}
                      dot={false}
                    >
                      {roastConfirmed ? "Saved" : "Draft"}
                    </Badge>
                  }
                  action={
                    <ButtonGroup label="Confirm drafted Bean">
                      <Button
                        emphasis={roastConfirmed ? "soft" : "filled"}
                        tone={roastConfirmed ? "neutral" : "brand"}
                        size="compact"
                        onClick={() => {
                          setRoastConfirmed(true);
                          setCurveDrawn(true);
                          setPulseActive(true);
                        }}
                      >
                        {roastConfirmed
                          ? "Roasted into Roastery"
                          : "Confirm & Roast"}
                      </Button>
                    </ButtonGroup>
                  }
                  variant="outlined"
                  density="compact"
                >
                  <Stack gap={8}>
                    <Heading level={4}>
                      Lead with the hard truth, not the build-up
                    </Heading>
                    <Surface
                      variant="surface"
                      density="compact"
                      className="bean-criteria-box"
                    >
                      <Stack gap={6}>
                        <Stack gap={2}>
                          <Text variant="meta">What mattered more</Text>
                          <Text as="p" variant="body">
                            Upfront trust and clarity over softening the moment.
                          </Text>
                        </Stack>
                        <Divider />
                        <Text as="p" variant="help">
                          Except when: External announcements needing legal
                          review first.
                        </Text>
                      </Stack>
                    </Surface>
                  </Stack>
                </Card>
              ) : (
                <Stack gap={8}>
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
                  <Text
                    as="p"
                    variant="body"
                    className={isDecaf ? "stage-reply-decaf" : undefined}
                  >
                    {streamedText}
                  </Text>
                  {!isDecaf && !isStreaming ? (
                    <Status tone="success">
                      {act === "brew"
                        ? brewMode === "growth"
                          ? "Guided by your Growth Roast Bean · Boundary verified"
                          : "Guided by your Specialist Roast Bean · Boundary verified"
                        : activeGuest.cite}
                    </Status>
                  ) : null}
                </Stack>
              )}
            </Message>
          </Stack>
        </Card>

        {/* CENTER: Subtle Ink Blue Bezier Signal */}
        <div className="stage-bridge-col" aria-hidden="true">
          <svg
            viewBox="0 0 56 300"
            width="56"
            height="300"
            style={{ overflow: "visible" }}
          >
            <path
              className="stage-signal-path"
              data-state={topCurveState}
              d="M 0 150 C 26 150, 30 88, 56 88"
            />
            <path
              className="stage-signal-path"
              data-state={bottomCurveState}
              d="M 0 150 C 26 150, 30 218, 56 218"
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
                path="M 56 88 C 30 88, 26 150, 0 150"
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
                path="M 56 218 C 30 218, 26 150, 0 150"
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
                path="M 0 150 C 26 150, 30 88, 56 88"
              />
            </circle>
          </svg>
        </div>

        {/* RIGHT: Native Yogurt Bean Cards */}
        <Stack gap={12}>
          <Inline justify="between" align="center" gap={8}>
            <Heading level={4}>{drawerHeading}</Heading>
            <Badge tone="neutral" dot={false}>
              {drawerSub}
            </Badge>
          </Inline>

          {act === "roast" ? (
            <Stack gap={12}>
              {roastConfirmed ? (
                <Card
                  variant="raised"
                  density="compact"
                  className="stage-bean-active"
                >
                  <Stack gap={6}>
                    <Inline justify="between" align="center" gap={6}>
                      <Badge tone="success" dot={false}>
                        Roasted just now
                      </Badge>
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
                </Card>
              ) : null}

              <Card
                variant="subtle"
                density="compact"
                className="stage-bean-idle"
              >
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
              </Card>
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
                    <Card
                      key={bean.id}
                      variant={isCardActive ? "raised" : "subtle"}
                      density="compact"
                      className={
                        isCardActive ? "stage-bean-active" : "stage-bean-idle"
                      }
                    >
                      <Stack gap={6}>
                        <Inline justify="between" align="center" gap={6}>
                          <Inline gap={6} align="center">
                            <Text variant="meta">{bean.label}</Text>
                            {isCardActive ? (
                              <Badge tone="brand" dot={false}>
                                Active
                              </Badge>
                            ) : null}
                          </Inline>
                          <Badge tone="neutral" dot={false}>
                            {bean.tag}
                          </Badge>
                        </Inline>
                        <Heading level={4}>{bean.title}</Heading>
                        <Text variant="help">{bean.tradeoff}</Text>
                        <Text variant="meta">Except: {bean.boundary}</Text>
                      </Stack>
                    </Card>
                  );
                },
              )}
            </Stack>
          )}
        </Stack>
      </div>
    </Stack>
  );

  return (
    <Stack gap={48}>
      {/* 1. HERO — Yogurt Brand Opening Rhythm + Universal One-Click Copy CTA */}
      <Stack gap={24}>
        <Grid className="home-hero-grid" gap={32}>
          <Stack gap={16}>
            <Inline gap={8} align="center">
              <Badge tone="neutral" variant="soft" dot={false}>
                Personal Taste plugin · ChatGPT, Claude, Codex, Cursor &amp;
                Antigravity
              </Badge>
            </Inline>

            <Heading level={1} className="home-hero-title">
              Your AI knows everything.
              <br />
              Give it your Taste.
            </Heading>

            <Text as="p" className="home-hero-lead">
              Save how you weigh real trade-offs—so your AI answers with your
              priorities, or lets you Coffee Chat with anyone else’s.
            </Text>

            <ButtonGroup label="Start with Coffee Chat">
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
              <Link
                href={
                  signedIn
                    ? "/me?compose=1"
                    : "/signin?returnTo=%2Fme%3Fcompose%3D1"
                }
                emphasis="soft"
                size="comfortable"
              >
                {signedIn ? "Open My Roastery" : "Try in browser"}
              </Link>
              <Link href="/connect" emphasis="quiet" size="comfortable">
                Manual setup
              </Link>
            </ButtonGroup>

            <Inline gap={8} align="center" wrap>
              <Text variant="meta">
                Paste into whatever AI you already use — no config file needed
                to start.
              </Text>
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => setShowPromptPreview((v) => !v)}
              >
                {showPromptPreview ? "Hide prompt" : "Preview prompt"}
              </Button>
            </Inline>
          </Stack>

          <Surface
            variant="raised"
            className="home-hero-artwork"
            aria-hidden="true"
          >
            <ProjectMark project="coffee" label="" size={140} />
          </Surface>
        </Grid>

        {showPromptPreview ? (
          <div className="home-prompt-code prompt-code-wrap">
            <CodeBlock
              code={universalStartPrompt}
              language="text"
              onCopy={copyPromptText}
            />
          </div>
        ) : null}
      </Stack>

      {/* 2. NATIVE YOGURT 3-ACT LIVE STAGE */}
      <Tabs
        label="Coffee Chat use cases"
        presentation="underline"
        value={act}
        onValueChange={(next) => setAct(next as StageAct)}
        items={[
          {
            id: "brew",
            label: "01 · Brew in your AI",
            panel: act === "brew" ? renderStagePanel() : null,
          },
          {
            id: "roast",
            label: "02 · Roast from a correction",
            panel: act === "roast" ? renderStagePanel() : null,
          },
          {
            id: "chat",
            label: "03 · Coffee Chat with other Taste",
            panel: act === "chat" ? renderStagePanel() : null,
          },
        ]}
      />

      <Divider />

      {/* 3. WHY COFFEE CHAT EXISTS — DIRECTLY BELOW USE CASES */}
      <Stack gap={24}>
        <Stack gap={12}>
          <Inline gap={8}>
            <Badge tone="brand" variant="soft" dot={false}>
              Why Coffee Chat
            </Badge>
          </Inline>
          <Heading level={2} className="why-headline">
            Nothing is unimportant.
            <br />
            Taste is what you put first.
          </Heading>
          <Text as="p" className="home-hero-lead">
            Everyone agrees speed, quality, honesty, and caution all matter. In
            real work, good things collide—and what decides the call is{" "}
            <strong>which one wins</strong> and{" "}
            <strong>when the rule flips</strong>. We save links and notes
            everywhere, but nothing organizes our priority order.
          </Text>
        </Stack>

        <Grid className="steps-grid" gap={16}>
          <Card variant="raised" density="regular">
            <Stack gap={8}>
              <Icon name="chat" />
              <Heading level={3}>Why a Coffee Chat here actually works</Heading>
              <Text as="p" variant="help">
                You don’t grab coffee with someone for textbook advice—you want
                to know what they put first when good options clash. Their
                confirmed Beans let your AI apply their real priorities to your
                situation, never roleplayed.
              </Text>
            </Stack>
          </Card>

          <Card variant="raised" density="regular">
            <Stack gap={8}>
              <Icon name="sliders" />
              <Heading level={3}>Why your AI stops saying “it depends”</Heading>
              <Text as="p" variant="help">
                Models treat every principle as equally valid. Once you Roast
                your priority order into private Beans, your AI stops hedging
                and commits to what you actually optimize for.
              </Text>
            </Stack>
          </Card>

          <Card variant="raised" density="regular">
            <Stack gap={8}>
              <Icon name="check" />
              <Heading level={3}>Confirmed by you, zero server AI</Heading>
              <Text as="p" variant="help">
                Nothing saves without your confirmation, and Coffee Chat runs no
                models of its own. Everything stays private by default and brews
                straight inside your AI.
              </Text>
            </Stack>
          </Card>
        </Grid>
      </Stack>

      <Divider />

      {/* 4. SECONDARY BOTTOM SHOWCASE: Real Table preview */}
      {totalCorpusPublicCount > 0 && featuredTable ? (
        <Stack gap={16}>
          <Inline justify="between" align="end" gap={16} wrap>
            <Stack gap={4}>
              <Text variant="meta">On the Table right now</Text>
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

          <Grid className="split-grid" gap={16}>
            {contrastingPreview.map((b) => (
              <Card key={b.id} variant="raised" density="regular">
                <Stack gap={12}>
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

                  <Surface
                    variant="surface"
                    density="compact"
                    className="bean-criteria-box"
                  >
                    <Stack gap={6}>
                      <Stack gap={2}>
                        <Text variant="meta">What mattered more</Text>
                        <Text as="p" variant="body">
                          {b.tradeoff}
                        </Text>
                      </Stack>
                      <Divider />
                      <Text as="p" variant="help">
                        Except when: {b.boundary}
                      </Text>
                    </Stack>
                  </Surface>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Stack>
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
          <Text variant="help">
            Every Bean starts private to you and your connected AI. Share only
            the priority calls you explicitly choose to put On the Table.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
