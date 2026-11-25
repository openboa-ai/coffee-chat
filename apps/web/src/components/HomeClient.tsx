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
import {
  BalanceScaleScene,
  HeroBeanDropStage,
  StoryboardTrio,
} from "./CoffeeStoryVisuals";

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
  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [copiedFooterPrompt, setCopiedFooterPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

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

  return (
    <div className="cc-landing">
      {/* ================================================================
          SCENE 1 — HERO: SHORT HOOK + LIVE ANIMATED BEAN-DROP INTO AI
         ================================================================ */}
      <section className="cc-cafe-hero" aria-label="Introduction">
        <div className="cc-wrap cc-cafe-grid">
          <div className="cc-cafe-copy">
            <div className="cc-cafe-mark-row">
              <ProjectMark project="coffee" label="" size={26} />
              <span className="cc-cafe-eyebrow">Coffee Chat</span>
            </div>

            <h1 className="cc-cafe-h1">
              Your AI knows
              <br />
              everything.
              <br />
              Give it <em className="cc-roast-em">your Taste.</em>
            </h1>

            <p className="cc-cafe-lead">
              Drop your priorities into any AI—so it stops saying “it depends.”
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
          </div>

          {/* RIGHT: SELF-PLAYING ANIMATED VISUAL — WATCH THE BEAN DROP INTO AI */}
          <HeroBeanDropStage />
        </div>
      </section>

      {/* ================================================================
          SCENE 2 — VELVETY ESPRESSO BAND: ANIMATED BALANCE SCALE
         ================================================================ */}
      <section className="cc-espresso-band" aria-label="Why Coffee Chat">
        <div className="cc-wrap cc-scale-band-grid">
          <div className="cc-band-lead">
            <span className="cc-kicker-crema">Why Taste matters</span>
            <h2 className="cc-espresso-h2">
              Nothing is unimportant.
              <br />
              Taste is <em className="cc-crema-em">what you put first.</em>
            </h2>
            <p className="cc-espresso-p">
              Both sides matter. Your Taste decides which pan drops.
            </p>
          </div>

          <BalanceScaleScene />
        </div>
      </section>

      {/* ================================================================
          SCENE 3 — 3-PANEL VISUAL STORYBOARD (ROAST · COFFEE CHAT · ANY AI)
         ================================================================ */}
      <section className="cc-linen-band" aria-label="How Coffee Chat works">
        <div className="cc-wrap cc-story-section">
          <div className="cc-story-head">
            <span className="cc-kicker-warm">How it works</span>
            <h2 className="cc-moment-h2">Three moves. Zero friction.</h2>
          </div>

          <StoryboardTrio />
        </div>
      </section>

      {/* ================================================================
          SCENE 4 — LIVE ON THE TABLE (COMPACT VISUAL CONTRAST)
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
                  <h2 className="cc-moment-h2">Same essay. Opposite Roasts.</h2>
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
              <h2 className="cc-moment-h2">Start the first Table.</h2>
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
          SCENE 5 — CLOSING INVITATION
         ================================================================ */}
      <section className="cc-closer-band" aria-label="Get started">
        <div className="cc-wrap cc-closer-inner">
          <div className="cc-closer-copy">
            <ProjectMark project="coffee" label="" size={38} />
            <h2 className="cc-closer-h2">
              Stop drinking decaf answers.
              <br />
              <em className="cc-roast-em">Pour your Taste in.</em>
            </h2>
          </div>

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
