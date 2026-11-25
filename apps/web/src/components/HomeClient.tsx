"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@openboa/yogurt/button";
import { CodeBlock } from "@openboa/yogurt/code-block";
import { ProjectMark } from "@openboa/yogurt/project-mark";
import type {
  BeanDetail,
  HydratedShelfRef,
  PublicPersonCard,
} from "@coffee-chat/core";
import { TasteFieldCanvas } from "./TasteFieldCanvas";

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

type BrewMode = "decaf" | "growth" | "craft";
type ChatGuest = "claire" | "david";
type LensPreset = "default" | "claire" | "david";

function HairlineBeam({
  leftLabel,
  rightLabel,
  position,
  muted = false,
}: {
  leftLabel: string;
  rightLabel: string;
  position: number;
  muted?: boolean;
}) {
  const clamped = Math.max(4, Math.min(96, position));
  const fillStart = Math.min(50, clamped);
  const fillWidth = Math.abs(clamped - 50);
  const isNeutral = muted || fillWidth < 4;
  const leftWins = !isNeutral && clamped < 44;
  const rightWins = !isNeutral && clamped > 56;

  return (
    <div className="cc-beam" aria-label={`${leftLabel} versus ${rightLabel}`}>
      <div className="cc-beam-labels">
        <span className="cc-beam-pole" data-wins={leftWins}>
          {leftLabel}
        </span>
        <span className="cc-beam-pole" data-wins={rightWins}>
          {rightLabel}
        </span>
      </div>
      <div className="cc-beam-rail">
        <span className="cc-beam-center" aria-hidden="true" />
        <span
          className="cc-beam-active"
          data-muted={isNeutral}
          style={{
            insetInlineStart: `${fillStart}%`,
            inlineSize: `${fillWidth}%`,
          }}
          aria-hidden="true"
        />
        <span
          className="cc-beam-node"
          data-muted={isNeutral}
          style={{ insetInlineStart: `${clamped}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function capitalizePole(raw: string): string {
  const cleaned = raw.trim().replace(/\.+$/, "");
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function splitTradeoffPoles(tradeoff: string): [string, string] | null {
  const match = tradeoff.match(/^(.+?)\s+over\s+(.+?)\.?$/i);
  if (!match || !match[1] || !match[2]) return null;
  const first = capitalizePole(match[1]);
  const second = capitalizePole(match[2]);
  if (!first || !second) return null;
  return [first, second];
}

function biasToMode(bias: number): BrewMode {
  if (bias < 38) return "growth";
  if (bias > 62) return "craft";
  return "decaf";
}

const BREW_CALLS: Record<
  BrewMode,
  {
    kicker: string;
    verdict: string;
    note: string;
    boundary: string;
  }
> = {
  decaf: {
    kicker: "DEFAULT AI · 50 / 50",
    verdict: "“It depends on your goals — both have strong pros and cons.”",
    note: "Every AI today weighs both sides equally and hands the decision right back to you.",
    boundary: "No Taste plugged in",
  },
  growth: {
    kicker: "GROWTH ROAST · YOUR BEAN",
    verdict: "Hire the fast-learning generalist.",
    note: "Ownership and learning speed outrank exact prior playbooks.",
    boundary: "Flips if day-1 certification is required",
  },
  craft: {
    kicker: "SPECIALIST ROAST · YOUR BEAN",
    verdict: "Hire the proven specialist.",
    note: "Immediate execution beats ramp-up time when the deadline won’t move.",
    boundary: "Flips if role scope changes every month",
  },
};

const LENS_PRESETS: Record<
  LensPreset,
  {
    caption: string;
    muted: boolean;
    values: [number, number, number];
  }
> = {
  default: {
    caption:
      "Default AI sits dead-center at 50/50 — treating every value as equally important.",
    muted: true,
    values: [50, 50, 50],
  },
  claire: {
    caption:
      "@claire puts fast real-world feedback, learning speed, and upfront truth first.",
    muted: false,
    values: [16, 20, 18],
  },
  david: {
    caption:
      "@david puts day-1 customer trust, proven craft, and measured framing first.",
    muted: false,
    values: [84, 78, 72],
  },
};

const LENS_AXES: Array<[string, string]> = [
  ["Real feedback", "Upfront polish"],
  ["Fast learner", "Proven craft"],
  ["Hard truth first", "Gentle build-up"],
];

const CHAT_GUESTS: Record<
  ChatGuest,
  {
    fullName: string;
    handle: string;
    leftPole: string;
    rightPole: string;
    position: number;
    verdict: string;
    reason: string;
    boundary: string;
  }
> = {
  claire: {
    fullName: "Claire Brooks",
    handle: "@claire",
    leftPole: "Real feedback",
    rightPole: "Upfront polish",
    position: 18,
    verdict: "Based on @claire’s Beans, show an honest draft this week.",
    reason:
      "Real customer signal beats a month of blind polish — as long as the bet stays reversible.",
    boundary: "Except: irreversible public launch",
  },
  david: {
    fullName: "David Chen",
    handle: "@david",
    leftPole: "Early demos",
    rightPole: "Day-1 trust",
    position: 84,
    verdict: "Based on @david’s Beans, test only on sample data first.",
    reason:
      "People forgive rough screens, never a billing or privacy slip — keep real data untouched.",
    boundary: "Except: throwaway prototype on sample data",
  },
};

export function HomeClient({
  signedIn,
  mcpUrl,
  totalCorpusPublicCount,
  featuredTable,
}: HomeClientProps) {
  const router = useRouter();
  const [heroBias, setHeroBias] = useState<number>(18);
  const [lensPreset, setLensPreset] = useState<LensPreset>("claire");
  const [roastConfirmed, setRoastConfirmed] = useState<boolean>(false);
  const [guest, setGuest] = useState<ChatGuest>("claire");

  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [copiedFooterPrompt, setCopiedFooterPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const brewMode = biasToMode(heroBias);
  const isDecaf = brewMode === "decaf";
  const activeCall = BREW_CALLS[brewMode];
  const activeLens = LENS_PRESETS[lensPreset];
  const activeGuest = CHAT_GUESTS[guest];

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

  const handleCopyHeroPrompt = async () => {
    await copyPromptText(universalStartPrompt);
    setCopiedHeroPrompt(true);
    setShowPromptPreview(true);
    window.setTimeout(() => setCopiedHeroPrompt(false), 3500);
  };

  const handleCopyFooterPrompt = async () => {
    await copyPromptText(universalStartPrompt);
    setCopiedFooterPrompt(true);
    window.setTimeout(() => setCopiedFooterPrompt(false), 3500);
  };

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

  const leftWins = heroBias < 38;
  const rightWins = heroBias > 62;
  const fillStart = Math.min(50, heroBias);
  const fillWidth = Math.abs(heroBias - 50);

  return (
    <div className="cc-landing">
      {/* ================================================================
          STAGE 01 — FULL-BLEED LIVING CANVAS + TACTILE PRIORITY BEAM
         ================================================================ */}
      <section className="cc-stage-hero" aria-label="Introduction">
        <TasteFieldCanvas bias={heroBias} />

        {/* Subtle architectural corner reticles */}
        <div className="cc-stage-reticles" aria-hidden="true">
          <span className="cc-reticle cc-reticle-tl" />
          <span className="cc-reticle cc-reticle-tr" />
          <span className="cc-reticle cc-reticle-bl" />
          <span className="cc-reticle cc-reticle-br" />
        </div>

        <div className="cc-stage-inner">
          <div className="cc-stage-grid">
            {/* LEFT: MONUMENTAL TYPOGRAPHY + ONE IRRESISTIBLE PILL CTA */}
            <div className="cc-stage-copy">
              <div className="cc-mono-eyebrow">
                <ProjectMark project="coffee" label="" size={18} />
                <span>00 // COFFEE CHAT</span>
              </div>

              <h1 className="cc-display-h1">
                Your AI knows
                <br />
                everything.
                <br />
                Give it <em className="cc-ink-em">your Taste.</em>
              </h1>

              <p className="cc-editorial-p">
                Stop getting “it depends.” Save what you put first—so your AI
                decides like you, or lets you Coffee Chat with anyone else’s
                judgment.
              </p>

              <div className="cc-cta-cluster">
                <Button
                  emphasis="filled"
                  tone="brand"
                  shape="pill"
                  size="comfortable"
                  onClick={() => void handleCopyHeroPrompt()}
                >
                  {copiedHeroPrompt
                    ? "Copied — paste into any AI"
                    : "Copy prompt to start in your AI"}
                </Button>

                <div className="cc-ghost-links">
                  <button
                    type="button"
                    className="cc-ghost-link"
                    onClick={() => setShowPromptPreview((v) => !v)}
                  >
                    {showPromptPreview ? "Hide prompt" : "Read prompt"}
                  </button>
                  <span className="cc-ghost-dot" aria-hidden="true">
                    ·
                  </span>
                  <Link
                    href={
                      signedIn
                        ? "/me?compose=1"
                        : "/signin?returnTo=%2Fme%3Fcompose%3D1"
                    }
                    className="cc-ghost-link"
                  >
                    {signedIn ? "Open My Roastery" : "Try in browser"}
                  </Link>
                  <span className="cc-ghost-dot" aria-hidden="true">
                    ·
                  </span>
                  <Link href="/connect" className="cc-ghost-link">
                    Manual setup
                  </Link>
                </div>
              </div>

              <p className="cc-mono-caption">
                WORKS IN CHATGPT · CLAUDE · CODEX · CURSOR · ANTIGRAVITY — ZERO
                CONFIG
              </p>

              {showPromptPreview ? (
                <div className="cc-prompt-drawer prompt-code-wrap">
                  <CodeBlock
                    code={universalStartPrompt}
                    language="text"
                    onCopy={copyPromptText}
                  />
                </div>
              ) : null}
            </div>

            {/* RIGHT: FRAMELESS TACTILE PRIORITY BEAM (DRAG OR TAP — ZERO BOXES!) */}
            <div
              className="cc-dial-zone"
              aria-label="Interactive Taste priority demo"
            >
              <div className="cc-dial-question">
                <span className="cc-mono-eyebrow">
                  LIVE CALL // HIRING FINALIST
                </span>
                <p className="cc-dial-prompt">
                  “Fast-learning generalist, or proven specialist for a Q3
                  launch?”
                </p>
              </div>

              {/* Frameless 3-Stop Selector + Tactile Draggable Hairline Beam */}
              <div className="cc-dial-control">
                <div
                  className="cc-dial-stops"
                  role="radiogroup"
                  aria-label="Tilt priority to change the AI call"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={brewMode === "growth"}
                    className="cc-dial-stop"
                    data-active={brewMode === "growth"}
                    onClick={() => setHeroBias(16)}
                  >
                    <span className="cc-dial-stop-name">Growth Roast</span>
                    <span className="cc-dial-stop-pole">Learning speed</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={brewMode === "decaf"}
                    className="cc-dial-stop cc-dial-stop-center"
                    data-active={brewMode === "decaf"}
                    onClick={() => setHeroBias(50)}
                  >
                    <span className="cc-dial-stop-name">Default AI</span>
                    <span className="cc-dial-stop-pole">50 / 50</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={brewMode === "craft"}
                    className="cc-dial-stop cc-dial-stop-end"
                    data-active={brewMode === "craft"}
                    onClick={() => setHeroBias(84)}
                  >
                    <span className="cc-dial-stop-name">Specialist Roast</span>
                    <span className="cc-dial-stop-pole">Proven craft</span>
                  </button>
                </div>

                <div className="cc-slider-shell">
                  <div className="cc-slider-rail" aria-hidden="true">
                    <span className="cc-slider-center-tick" />
                    <span
                      className="cc-slider-fill"
                      data-muted={isDecaf}
                      style={{
                        insetInlineStart: `${fillStart}%`,
                        inlineSize: `${fillWidth}%`,
                      }}
                    />
                    <span
                      className="cc-slider-thumb"
                      data-muted={isDecaf}
                      style={{ insetInlineStart: `${heroBias}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={92}
                    value={heroBias}
                    aria-label="Drag to tilt Taste between Learning speed and Proven craft"
                    className="cc-slider-input"
                    onChange={(e) => setHeroBias(Number(e.target.value))}
                  />
                </div>

                <div className="cc-slider-hint">
                  <span data-wins={leftWins}>← Drag or tap a priority</span>
                  <span data-wins={rightWins}>Watch the AI commit →</span>
                </div>
              </div>

              {/* FRAMELESS LIVE AI VERDICT */}
              <div
                key={brewMode}
                className="cc-verdict-stage"
                data-decaf={isDecaf}
              >
                <span className="cc-mono-eyebrow">{activeCall.kicker}</span>
                <p className="cc-verdict-headline">{activeCall.verdict}</p>
                <p className="cc-verdict-note">{activeCall.note}</p>
                <span className="cc-verdict-boundary">
                  {activeCall.boundary}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          STAGE 02 — FOUNDER THESIS + FRAMELESS 3-AXIS PRIORITY LENS
         ================================================================ */}
      <section className="cc-band" aria-label="Why Coffee Chat">
        <div className="cc-band-inner cc-split-editorial">
          <div className="cc-band-lead">
            <span className="cc-mono-eyebrow">01 // WHY IT WORKS</span>
            <h2 className="cc-display-h2">
              Nothing is unimportant.
              <br />
              Taste is <em className="cc-ink-em">what you put first.</em>
            </h2>
            <p className="cc-editorial-p">
              Everyone agrees speed, craft, and honesty matter. In real work,
              good values collide—and judgment is simply which one wins, and
              where the rule flips.
            </p>
          </div>

          <div className="cc-lens-panel">
            <div
              className="cc-underline-tabs"
              role="radiogroup"
              aria-label="Compare priority order"
            >
              {(
                [
                  ["default", "Default AI"],
                  ["claire", "@claire"],
                  ["david", "@david"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={lensPreset === id}
                  className="cc-underline-tab"
                  data-active={lensPreset === id}
                  onClick={() => setLensPreset(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="cc-lens-beams">
              {LENS_AXES.map(([leftPole, rightPole], idx) => (
                <HairlineBeam
                  key={leftPole}
                  leftLabel={leftPole}
                  rightLabel={rightPole}
                  position={activeLens.values[idx] ?? 50}
                  muted={activeLens.muted}
                />
              ))}
            </div>

            <p className="cc-lens-caption">{activeLens.caption}</p>
          </div>
        </div>
      </section>

      {/* ================================================================
          STAGE 03 — TWO LIVING MOMENTS: ROAST & COFFEE CHAT (FRAMELESS)
         ================================================================ */}
      <section className="cc-band" aria-label="How Coffee Chat works in real life">
        <div className="cc-band-inner cc-moments-stack">
          {/* MOMENT A: ROAST FROM ONE CORRECTION */}
          <div className="cc-moment-row">
            <div className="cc-moment-copy">
              <span className="cc-mono-eyebrow">02 // ROAST</span>
              <h2 className="cc-moment-h2">
                Correct your AI once.
                <br />
                Never repeat it.
              </h2>
              <p className="cc-editorial-p-sm">
                Push back naturally during real work. Coffee Chat drafts the
                trade-off and waits for your explicit tap before saving
                privately.
              </p>
            </div>

            <div className="cc-moment-artifact">
              <div className="cc-roast-diff">
                <span className="cc-roast-struck">
                  Slide 4 · Missed Q3 target (-12%)
                </span>
                <p className="cc-roast-quote">
                  “Don’t bury bad news on slide 4. Put the honest status in
                  sentence 1.”
                </p>
              </div>

              <button
                type="button"
                className="cc-confirm-cue"
                data-confirmed={roastConfirmed}
                onClick={() => setRoastConfirmed((v) => !v)}
              >
                <span className="cc-confirm-ring" aria-hidden="true">
                  <span className="cc-confirm-dot" />
                </span>
                <span className="cc-confirm-label">
                  {roastConfirmed
                    ? "CONFIRMED · SAVED PRIVATELY"
                    : "TAP TO CONFIRM & ROAST PRIVATELY"}
                </span>
              </button>

              <div
                className="cc-roast-result"
                data-confirmed={roastConfirmed}
              >
                <p className="cc-roast-title">
                  Lead with the hard truth, not the build-up
                </p>
                <HairlineBeam
                  leftLabel="Hard truth first"
                  rightLabel="Soft build-up"
                  position={roastConfirmed ? 16 : 44}
                  muted={!roastConfirmed}
                />
                <span className="cc-verdict-boundary">
                  {roastConfirmed
                    ? "Live across every connected AI · Except: external legal review"
                    : "Waiting for your confirmation · Private by default"}
                </span>
              </div>
            </div>
          </div>

          {/* MOMENT B: COFFEE CHAT WITH SOMEONE ELSE'S TASTE */}
          <div className="cc-moment-row cc-moment-divider">
            <div className="cc-moment-copy">
              <span className="cc-mono-eyebrow">03 // COFFEE CHAT</span>
              <h2 className="cc-moment-h2">
                Sit down with someone’s
                <br />
                real priorities.
              </h2>
              <p className="cc-editorial-p-sm">
                Ask how someone else would weigh your real decision—grounded in
                their confirmed public Beans, clearly attributed, never
                roleplayed.
              </p>
            </div>

            <div className="cc-moment-artifact">
              <p className="cc-chat-question">
                “Polish another month, or show 10 customers a rough draft this
                week?”
              </p>

              <div
                className="cc-underline-tabs"
                role="radiogroup"
                aria-label="Choose someone to Coffee Chat with"
              >
                {(
                  [
                    ["claire", "Coffee Chat with @claire"],
                    ["david", "Coffee Chat with @david"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={guest === key}
                    className="cc-underline-tab"
                    data-active={guest === key}
                    onClick={() => setGuest(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div key={guest} className="cc-chat-verdict">
                <p className="cc-verdict-headline">{activeGuest.verdict}</p>
                <p className="cc-verdict-note">{activeGuest.reason}</p>
                <HairlineBeam
                  leftLabel={activeGuest.leftPole}
                  rightLabel={activeGuest.rightPole}
                  position={activeGuest.position}
                />
                <span className="cc-verdict-boundary">
                  Attributed to {activeGuest.handle} · Never roleplayed ·{" "}
                  {activeGuest.boundary}
                </span>
              </div>
            </div>
          </div>

          {/* MOMENT C: QUIET ARCHITECTURAL INVARIANTS */}
          <div className="cc-invariants-strip">
            <div className="cc-invariant">
              <span className="cc-mono-eyebrow">CONFIRM GATE</span>
              <p className="cc-invariant-text">
                Nothing saves silently. Every Bean waits for your explicit tap.
              </p>
            </div>
            <div className="cc-invariant">
              <span className="cc-mono-eyebrow">ZERO SERVER AI</span>
              <p className="cc-invariant-text">
                Coffee Chat runs no models. Your own AI connects directly via
                MCP.
              </p>
            </div>
            <div className="cc-invariant">
              <span className="cc-mono-eyebrow">PRIVATE BY DEFAULT</span>
              <p className="cc-invariant-text">
                Keep your Roastery private; share only the takes you put On the
                Table.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          STAGE 04 — LIVE ON THE TABLE (FRAMELESS 2-COLUMN EDITORIAL SPLIT)
         ================================================================ */}
      <section className="cc-band" aria-label="On the Table right now">
        <div className="cc-band-inner">
          {totalCorpusPublicCount > 0 && featuredTable ? (
            <>
              <div className="cc-table-head">
                <div>
                  <span className="cc-mono-eyebrow">
                    ON THE TABLE RIGHT NOW
                  </span>
                  <h2 className="cc-moment-h2">
                    Same essay. Opposite Roasts.
                  </h2>
                  <p className="cc-table-source">
                    {featuredTable.sourceTitle ?? featuredTable.normalizedUrl}
                  </p>
                </div>
                <div className="cc-ghost-links">
                  <Link
                    href={`/sources/${featuredTable.originId}`}
                    className="cc-ghost-link cc-ghost-link-strong"
                  >
                    Open this Table →
                  </Link>
                  <span className="cc-ghost-dot" aria-hidden="true">
                    ·
                  </span>
                  <Link href="/sources" className="cc-ghost-link">
                    Browse all Tables
                  </Link>
                </div>
              </div>

              <div className="cc-open-spread">
                {contrastingPreview.map((b, idx) => {
                  const poles = splitTradeoffPoles(b.tradeoff);
                  return (
                    <article key={b.id} className="cc-open-spread-col">
                      <div className="cc-spread-author">
                        <Link
                          href={`/@${b.ownerHandle}`}
                          className="cc-author-link"
                        >
                          <span className="cc-author-name">
                            {b.ownerDisplayName}
                          </span>
                          <span className="cc-author-handle">
                            @{b.ownerHandle}
                          </span>
                        </Link>
                        <Link
                          href={`/@${b.ownerHandle}`}
                          className="cc-ghost-link"
                        >
                          Coffee Chat →
                        </Link>
                      </div>

                      <h3 className="cc-spread-title">{b.title}</h3>

                      {poles ? (
                        <HairlineBeam
                          leftLabel={idx === 1 ? poles[1] : poles[0]}
                          rightLabel={idx === 1 ? poles[0] : poles[1]}
                          position={idx === 1 ? 82 : 18}
                        />
                      ) : (
                        <p className="cc-verdict-note">{b.tradeoff}</p>
                      )}

                      <span className="cc-verdict-boundary">
                        Stops if: {b.boundary}
                      </span>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="cc-empty-closing">
              <span className="cc-mono-eyebrow">START YOUR ROASTERY</span>
              <h2 className="cc-moment-h2">
                Start the first Coffee Chat Table.
              </h2>
              <p className="cc-editorial-p-sm">
                Every Bean starts private to you and your connected AI. Share
                only what you explicitly choose to put On the Table.
              </p>
              <div className="cc-cta-cluster">
                <Button
                  emphasis="filled"
                  tone="neutral"
                  shape="pill"
                  size="comfortable"
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
                <Link href="/connect" className="cc-ghost-link">
                  Manual setup →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          STAGE 05 — FINAL DESIRE CLOSER
         ================================================================ */}
      <section className="cc-band cc-band-closer" aria-label="Get started">
        <div className="cc-band-inner cc-closer-inner">
          <h2 className="cc-display-h2">
            Ready to stop hearing
            <br />
            <em className="cc-ink-em">“it depends”?</em>
          </h2>
          <Button
            emphasis="filled"
            tone="brand"
            shape="pill"
            size="comfortable"
            onClick={() => void handleCopyFooterPrompt()}
          >
            {copiedFooterPrompt
              ? "Copied — paste into your AI"
              : "Copy prompt & start now"}
          </Button>
        </div>
      </section>
    </div>
  );
}
