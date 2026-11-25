"use client";

import { useEffect, useState } from "react";
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
import {
  InteractiveCafeTable,
  KineticTypoSeesaw,
} from "./EditorialScenes";
import { RealAiChatSession } from "./RealAiChatSession";

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

type HeroRoastMode = "decaf" | "growth" | "craft";

const HERO_MODES: Array<{
  id: HeroRoastMode;
  label: string;
  aiTag: string;
  chip: string;
  verdict: string;
  guardLabel: string;
  guard: string;
}> = [
  {
    id: "decaf",
    label: "No Bean",
    aiTag: "Default Agent",
    chip: "50 / 50 hedge",
    verdict: "“It depends…”",
    guardLabel: "No Taste plugged in",
    guard: "Generic pros & cons with no priority applied",
  },
  {
    id: "growth",
    label: "Growth Roast",
    aiTag: "Your Agent",
    chip: "Bean applied",
    verdict: "Hire the fast learner.",
    guardLabel: "Speed > Playbooks",
    guard: "Flips if day-1 certification is required",
  },
  {
    id: "craft",
    label: "Specialist Roast",
    aiTag: "Your Agent",
    chip: "Bean applied",
    verdict: "Hire the proven specialist.",
    guardLabel: "Craft > Speed",
    guard: "Flips if role scope keeps shifting",
  },
];

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

function MiniContrastBeam({
  leftLabel,
  rightLabel,
  lean,
}: {
  leftLabel: string;
  rightLabel: string;
  lean: "left" | "right";
}) {
  const pos = lean === "left" ? 18 : 82;
  const fillStart = lean === "left" ? 18 : 50;
  return (
    <div className="cc-beam" data-tone={lean === "left" ? "coffee" : "ink"}>
      <div className="cc-beam-labels">
        <span className="cc-beam-pole" data-wins={lean === "left"}>
          {leftLabel}
        </span>
        <span className="cc-beam-pole" data-wins={lean === "right"}>
          {rightLabel}
        </span>
      </div>
      <div className="cc-beam-rail">
        <span className="cc-beam-center" aria-hidden="true" />
        <span
          className="cc-beam-active"
          style={{ insetInlineStart: `${fillStart}%`, inlineSize: "32%" }}
          aria-hidden="true"
        />
        <span
          className="cc-beam-node"
          style={{ insetInlineStart: `${pos}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function HomeClient({
  signedIn,
  mcpUrl,
  totalCorpusPublicCount,
  featuredTable,
}: HomeClientProps) {
  const router = useRouter();
  const [heroMode, setHeroMode] = useState<HeroRoastMode>("growth");
  const [heroLocked, setHeroLocked] = useState(false);

  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [copiedFooterPrompt, setCopiedFooterPrompt] = useState(false);
  const [copiedChatPrompt, setCopiedChatPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Gently cycle Growth -> Specialist -> Decaf so visitors instantly see the photo & AI verdict flip
  useEffect(() => {
    if (heroLocked) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const order: HeroRoastMode[] = ["growth", "craft", "decaf"];
    const timer = window.setInterval(() => {
      setHeroMode((cur) => {
        const nextIdx = (order.indexOf(cur) + 1) % order.length;
        return order[nextIdx] ?? "growth";
      });
    }, 4500);

    return () => window.clearInterval(timer);
  }, [heroLocked]);

  const activeHero =
    HERO_MODES.find((m) => m.id === heroMode) ?? HERO_MODES[1]!;

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

  const handleCopyChatPrompt = async () => {
    await copyPromptText(universalStartPrompt);
    setCopiedChatPrompt(true);
    window.setTimeout(() => setCopiedChatPrompt(false), 3500);
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

  return (
    <div className="cc-landing">
      {/* ================================================================
          ACT 01 — ABOVE-THE-FOLD HERO: ZERO SCROLL NEEDED TO FEEL THE VALUE
         ================================================================ */}
      <section className="cc-editorial-hero" aria-label="Introduction">
        <div className="cc-wrap cc-hero-split">
          {/* LEFT: PURE MONUMENTAL VALUE HOOK + ONE PRIMARY ACTION */}
          <div className="cc-hero-left">
            <div className="cc-cafe-kicker-pill">
              <span className="cc-kicker-dot" aria-hidden="true" />
              <span>Personal Taste Protocol · MCP</span>
            </div>

            <h1 className="cc-cafe-h1">
              <span>Your Agents</span>
              <span>know everything.</span>
              <span>
                Give them <em className="cc-roast-em">your Taste.</em>
              </span>
            </h1>

            <p className="cc-cafe-lead">
              Stop getting “it depends.” Plug what you put first into your
              Agents—so they decide like you, or pour you someone else’s real
              take.
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
                  ? "Copied — paste into any Agent"
                  : "Copy prompt to start in your Agent"}
              </Button>

              <div className="cc-warm-links">
                <button
                  type="button"
                  className="cc-warm-link"
                  onClick={() => setShowPromptPreview((v) => !v)}
                >
                  {showPromptPreview ? "Hide prompt" : "Read prompt"}
                </button>
                <span className="cc-warm-dot" aria-hidden="true">
                  ·
                </span>
                <Link
                  href={
                    signedIn
                      ? "/me?compose=1"
                      : "/signin?returnTo=%2Fme%3Fcompose%3D1"
                  }
                  className="cc-warm-link"
                >
                  {signedIn ? "Open My Roastery" : "Try in browser"}
                </Link>
                <span className="cc-warm-dot" aria-hidden="true">
                  ·
                </span>
                <Link href="/connect" className="cc-warm-link">
                  Manual setup
                </Link>
              </div>
            </div>

            {showPromptPreview ? (
              <div className="cc-prompt-drawer prompt-code-wrap">
                <CodeBlock
                  code={universalStartPrompt}
                  language="text"
                  onCopy={copyPromptText}
                />
              </div>
            ) : null}

            {/* Architectural 3-step ledger anchored flush with photo baseline */}
            <ol
              className="cc-hero-ledger"
              aria-label="How Coffee Chat works in three steps"
            >
              <li>
                <span className="cc-ledger-num">01</span>
                <strong>Roast a priority</strong>
              </li>
              <li>
                <span className="cc-ledger-num">02</span>
                <strong>Plug into Agents</strong>
              </li>
              <li>
                <span className="cc-ledger-num">03</span>
                <strong>Get decisive calls</strong>
              </li>
            </ol>
          </div>

          {/* RIGHT: REALISTIC COFFEE PHOTO ALIVE WITH INTERACTIVE AGENT OVERLAYS */}
          <figure className="cc-hero-art-frame" data-mode={heroMode}>
            <img
              src="/art/hero-pour.jpg"
              alt="Overhead studio still life of a porcelain espresso cup with golden crema on a deep ink-blue saucer beside roasted coffee beans on warm linen"
              className="cc-hero-art-img"
            />

            {/* Animated saucer aura + soft billowing steam above the upper rim */}
            <span className="cc-hero-art-aura" aria-hidden="true" />
            <svg
              viewBox="0 0 140 72"
              className="cc-hero-steam-svg"
              aria-hidden="true"
            >
              <path
                className="cc-hero-steam-line cc-hero-steam-1"
                d="M 46 64 C 38 48, 52 34, 42 14"
                fill="none"
                stroke="var(--cc-crema)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                className="cc-hero-steam-line cc-hero-steam-2"
                d="M 70 66 C 60 46, 80 30, 68 8"
                fill="none"
                stroke="var(--boa-color-neutral-50)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                className="cc-hero-steam-line cc-hero-steam-3"
                d="M 94 62 C 86 46, 100 34, 90 16"
                fill="none"
                stroke="var(--cc-crema)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>

            {/* TOP OVERLAY: TACTILE ROAST SWITCHER + USER QUESTION PILL */}
            <div className="cc-hero-overlay-top">
              <div
                className="cc-photo-roast-bar"
                role="radiogroup"
                aria-label="Switch Taste roast on the live Agent preview"
              >
                {HERO_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={heroMode === m.id}
                    className="cc-photo-roast-btn"
                    data-active={heroMode === m.id}
                    data-mode={m.id}
                    onClick={() => {
                      setHeroLocked(true);
                      setHeroMode(m.id);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="cc-photo-user-pill">
                <span className="cc-user-pill-kicker">Prompt</span>
                <span>“Fast learner or proven specialist?”</span>
              </div>
            </div>

            {/* BOTTOM OVERLAY: FROSTED LIVE AGENT ANSWER REACTING OVER THE COFFEE */}
            <figcaption
              key={heroMode}
              className="cc-hero-live-card"
              data-mode={heroMode}
            >
              {!heroLocked ? (
                <span className="cc-live-cycle-track" aria-hidden="true">
                  <i key={`bar-${heroMode}`} className="cc-live-cycle-fill" />
                </span>
              ) : null}

              <div className="cc-live-card-top">
                <div className="cc-live-card-head">
                  <span className="cc-live-card-dot" aria-hidden="true" />
                  <span>{activeHero.aiTag}</span>
                </div>
                <span className="cc-live-card-chip">{activeHero.chip}</span>
              </div>

              <p className="cc-live-card-verdict">{activeHero.verdict}</p>

              {heroMode === "decaf" ? (
                <div className="cc-decaf-lines" aria-hidden="true">
                  <span style={{ inlineSize: "86%" }} />
                  <span style={{ inlineSize: "60%" }} />
                </div>
              ) : null}

              <div className="cc-live-card-foot">
                <strong>{activeHero.guardLabel}</strong>
                <span>{activeHero.guard}</span>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ================================================================
          ACT 02 — FULL-BLEED DARK ESPRESSO: MONUMENTAL TYPOGRAPHIC SEESAW
         ================================================================ */}
      <section className="cc-espresso-band" aria-label="Why Coffee Chat">
        <div className="cc-wrap cc-espresso-center">
          <span className="cc-kicker-crema">Why Taste matters</span>
          <h2 className="cc-espresso-h2-giant">
            Nothing is unimportant.
            <br />
            Taste is <em className="cc-crema-em">what you put first.</em>
          </h2>

          <KineticTypoSeesaw />
        </div>
      </section>

      {/* ================================================================
          ACT 03 — INTERACTIVE REALISTIC CAFÉ TABLE WITH ANIMATED SIGNAL ARC
         ================================================================ */}
      <section className="cc-linen-band" aria-label="Coffee Chat across the table">
        <div className="cc-wrap">
          <InteractiveCafeTable />
        </div>
      </section>

      {/* ================================================================
          ACT 04 — REALISTIC AGENT LIVE CONVERSATION EXAMPLE
         ================================================================ */}
      <section
        className="cc-linen-band cc-linen-band-hairline"
        aria-label="Real Agent chat session example"
      >
        <div className="cc-wrap">
          <RealAiChatSession
            onCopyStarter={() => void handleCopyChatPrompt()}
            copied={copiedChatPrompt}
          />
        </div>
      </section>

      {/* ================================================================
          ACT 05 — LIVE ON THE TABLE RIGHT NOW (OPEN MAGAZINE SPREAD)
         ================================================================ */}
      <section
        className="cc-linen-band cc-linen-band-alt"
        aria-label="On the Table right now"
      >
        <div className="cc-wrap">
          {totalCorpusPublicCount > 0 && featuredTable ? (
            <>
              <div className="cc-table-head">
                <div>
                  <span className="cc-kicker-warm">On the Table right now</span>
                  <h2 className="cc-editorial-h2">
                    Same essay. Opposite Roasts.
                  </h2>
                  <p className="cc-table-source">
                    {featuredTable.sourceTitle ?? featuredTable.normalizedUrl}
                  </p>
                </div>
                <div className="cc-warm-links">
                  <Link
                    href={`/sources/${featuredTable.originId}`}
                    className="cc-warm-link cc-warm-link-ink"
                  >
                    Open this Table →
                  </Link>
                  <span className="cc-warm-dot" aria-hidden="true">
                    ·
                  </span>
                  <Link href="/sources" className="cc-warm-link">
                    All Tables
                  </Link>
                </div>
              </div>

              <div className="cc-open-spread">
                {contrastingPreview.map((b, idx) => {
                  const poles = splitTradeoffPoles(b.tradeoff);
                  const lean = idx === 1 ? "right" : "left";
                  return (
                    <article key={b.id} className="cc-open-spread-col">
                      <span
                        className="cc-spread-index"
                        data-tone={lean === "right" ? "ink" : "coffee"}
                      >
                        {idx === 0 ? "01 · Light Roast" : "02 · Dark Roast"}
                      </span>

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
                          className="cc-warm-link cc-warm-link-ink"
                        >
                          Coffee Chat →
                        </Link>
                      </div>

                      <h3 className="cc-spread-title">{b.title}</h3>

                      {poles ? (
                        <MiniContrastBeam
                          leftLabel={lean === "right" ? poles[1] : poles[0]}
                          rightLabel={lean === "right" ? poles[0] : poles[1]}
                          lean={lean}
                        />
                      ) : null}

                      <span className="cc-verdict-boundary">
                        Flips if: {b.boundary}
                      </span>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="cc-empty-closing">
              <span className="cc-kicker-warm">Your Roastery</span>
              <h2 className="cc-editorial-h2">Start the first Table.</h2>
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
                <Link href="/connect" className="cc-warm-link">
                  Manual setup →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          ACT 06 — SERENE CLOSING INVITATION
         ================================================================ */}
      <section className="cc-closer-band" aria-label="Get started">
        <div className="cc-wrap cc-closer-inner">
          <div className="cc-closer-copy">
            <ProjectMark project="coffee" label="" size={40} />
            <h2 className="cc-closer-h2">
              Stop drinking decaf answers.
              <br />
              <em className="cc-roast-em">Pour your Taste in.</em>
            </h2>
          </div>

          <div className="cc-closer-actions">
            <Button
              emphasis="filled"
              tone="brand"
              shape="pill"
              size="comfortable"
              onClick={() => void handleCopyFooterPrompt()}
            >
              {copiedFooterPrompt
                ? "Copied — paste into any Agent"
                : "Copy prompt & start now"}
            </Button>

            <div className="cc-warm-links">
              <Link
                href={
                  signedIn
                    ? "/me?compose=1"
                    : "/signin?returnTo=%2Fme%3Fcompose%3D1"
                }
                className="cc-warm-link"
              >
                {signedIn ? "Open My Roastery" : "Try in browser"}
              </Link>
              <span className="cc-warm-dot" aria-hidden="true">
                ·
              </span>
              <Link href="/sources" className="cc-warm-link">
                Browse Tables
              </Link>
              <span className="cc-warm-dot" aria-hidden="true">
                ·
              </span>
              <Link href="/connect" className="cc-warm-link">
                Manual setup
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
