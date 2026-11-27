"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { CodeBlock } from "@openboa/yogurt/code-block";
import type {
  BeanDetail,
  HydratedShelfRef,
  PublicPersonCard,
} from "@coffee-chat/core";
import type { StageChatPartner } from "@/lib/coffee-scene/cinemaEngine";
import { CoffeeWorldStage } from "./CoffeeWorldStage";

gsap.registerPlugin(ScrollTrigger, SplitText);

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

function useStreamingReply(targetText: string): {
  text: string;
  streaming: boolean;
} {
  const [displayed, setDisplayed] = useState(targetText);
  const [streaming, setStreaming] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setDisplayed(targetText);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplayed(targetText);
      setStreaming(false);
      return;
    }

    const words = targetText.split(" ");
    let idx = Math.min(3, words.length);
    setDisplayed(words.slice(0, idx).join(" "));
    setStreaming(idx < words.length);

    const timer = window.setInterval(() => {
      idx += 2;
      if (idx >= words.length) {
        setDisplayed(targetText);
        setStreaming(false);
        window.clearInterval(timer);
      } else {
        setDisplayed(words.slice(0, idx).join(" "));
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [targetText]);

  return { text: displayed, streaming };
}

const CHAPTERS = [
  { id: "problem", code: "01", label: "The Problem" },
  { id: "roast", code: "02", label: "Roast a Bean" },
  { id: "brew", code: "03", label: "Brew Everywhere" },
  { id: "coffee-chat", code: "04", label: "Coffee Chat" },
  { id: "start", code: "05", label: "Start" },
] as const;

export function HomeClient({
  signedIn,
  mcpUrl,
  featuredTable,
}: HomeClientProps) {
  const router = useRouter();
  const scopeRef = useRef<HTMLDivElement>(null);
  const heroHeadingRef = useRef<HTMLHeadingElement>(null);

  const [activeAct, setActiveAct] = useState(0);
  const [holding, setHolding] = useState(false);
  const [rippleNonce, setRippleNonce] = useState(0);

  // Cut 02: Interactive Capture Once (Roast)
  const [roastConfirmed, setRoastConfirmed] = useState(false);

  // Cut 03: Interactive Apply Everywhere (Brew) + Boundary Freeze
  const [boundaryTriggered, setBoundaryTriggered] = useState(false);

  // Cut 04: Interactive Two-Cup Coffee Chat
  const [chatPartner, setChatPartner] = useState<StageChatPartner>("claire");

  // Automated Motion-Control Camera Reel
  const [reelPlaying, setReelPlaying] = useState(false);
  const reelTimersRef = useRef<number[]>([]);

  // Copy prompt state
  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [copiedCloserPrompt, setCopiedCloserPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const startPrompt = `Connect to Coffee Chat at ${mcpUrl} (sign in when prompted). Once connected, help me save my first private Bean from a real decision or article I share with you—ask what mattered more and where the rule stops applying, and wait for my confirmation before saving.`;

  const triggerRipple = () => setRippleNonce((n) => n + 1);

  const copyStartPrompt = async (source: "hero" | "closer") => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(startPrompt);
      }
    } catch {
      // Clipboard may be blocked in restricted contexts.
    }
    if (source === "hero") {
      setCopiedHeroPrompt(true);
      window.setTimeout(() => setCopiedHeroPrompt(false), 3200);
    } else {
      setCopiedCloserPrompt(true);
      window.setTimeout(() => setCopiedCloserPrompt(false), 3200);
    }
    setShowPrompt(true);
    triggerRipple();
  };

  // Lenis smooth inertia scroll synced with GSAP ScrollTrigger
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.085,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onScrollTo = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (target) {
        const offset = window.innerWidth <= 1024 ? -280 : -56;
        lenis.scrollTo(target, { duration: 1.05, offset });
      }
    };
    window.addEventListener("coffee:scroll-to", onScrollTo);

    return () => {
      window.removeEventListener("coffee:scroll-to", onScrollTo);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // Crisp SplitText entrance & gentle cut reveals
  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      let split: SplitText | null = null;
      if (heroHeadingRef.current) {
        split = new SplitText(heroHeadingRef.current, {
          type: "lines,chars",
          mask: "lines",
        });
        gsap.from(split.chars, {
          yPercent: 106,
          opacity: 0,
          duration: 0.85,
          stagger: 0.013,
          ease: "power4.out",
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-cc-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 0.78,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 84%",
            toggleActions: "play none none reverse",
          },
        });
      });

      return () => {
        split?.revert();
      };
    },
    { scope: scopeRef },
  );

  const jumpToChapter = (id: string) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.getElementById(`cut-${id}`)?.scrollIntoView({ behavior: "auto" });
      return;
    }
    window.dispatchEvent(
      new CustomEvent("coffee:scroll-to", { detail: `#cut-${id}` }),
    );
  };

  const stopReel = () => {
    for (const id of reelTimersRef.current) {
      window.clearTimeout(id);
    }
    reelTimersRef.current = [];
    setReelPlaying(false);
  };

  useEffect(() => {
    if (!reelPlaying) return;
    const cancelOnInput = () => stopReel();
    window.addEventListener("wheel", cancelOnInput, { passive: true });
    window.addEventListener("touchstart", cancelOnInput, { passive: true });
    return () => {
      window.removeEventListener("wheel", cancelOnInput);
      window.removeEventListener("touchstart", cancelOnInput);
    };
  }, [reelPlaying]);

  useEffect(() => {
    return () => {
      for (const id of reelTimersRef.current) {
        window.clearTimeout(id);
      }
    };
  }, []);

  const toggleReel = () => {
    if (reelPlaying) {
      stopReel();
      return;
    }
    setReelPlaying(true);
    const schedule = (ms: number, fn: () => void) => {
      reelTimersRef.current.push(window.setTimeout(fn, ms));
    };

    jumpToChapter("problem");
    setRoastConfirmed(false);
    setBoundaryTriggered(false);
    setChatPartner("claire");

    schedule(2400, () => jumpToChapter("roast"));
    schedule(4000, () => {
      setRoastConfirmed(true);
      triggerRipple();
    });
    schedule(6200, () => {
      jumpToChapter("brew");
      setBoundaryTriggered(false);
    });
    schedule(8200, () => {
      setBoundaryTriggered(true);
      triggerRipple();
    });
    schedule(10600, () => {
      jumpToChapter("coffee-chat");
      setChatPartner("claire");
    });
    schedule(12200, () => {
      setChatPartner("david");
      triggerRipple();
    });
    schedule(13800, () => {
      setChatPartner("both");
      triggerRipple();
    });
    schedule(15800, () => {
      jumpToChapter("start");
      stopReel();
    });
  };

  // Streaming replies for Cut 03
  const brewVerdict = boundaryTriggered
    ? "Hold back speed on this launch."
    : "Show the labeled draft to 5 beta users today.";
  const brewExplain = boundaryTriggered
    ? "Your Bean explicitly stops applying when billing or privacy is on the line—verify billing edge cases before releasing."
    : "This is a reversible internal beta, so your Agent skips weeks of upfront polish and optimizes for real user signal.";
  const brewStream = useStreamingReply(brewExplain);

  // Camera Slate & Plain-Language Cinema Caption synced to right 54% viewport
  const cameraSlate =
    activeAct === 0
      ? "75° HERO · 50MM"
      : activeAct === 1
        ? "5° MACRO DIVE · 100MM"
        : activeAct === 2
          ? boundaryTriggered
            ? "1/4000S SHUTTER FREEZE"
            : "45° POUR TRACK · 85MM"
          : activeAct === 3
            ? chatPartner === "claire"
              ? "90° CRANE · DOLLY LEFT"
              : chatPartner === "david"
                ? "90° CRANE · DOLLY RIGHT"
                : "90° OVERHEAD CRANE · 35MM"
            : "CRANE PULL-BACK";

  const cinemaCaption =
    activeAct === 0
      ? "Without your standard — generic decaf hedge"
      : activeAct === 1
        ? roastConfirmed
          ? "Confirmed ✓ · 1 private Bean sealed"
          : "1 real call distilled into 1 Bean"
        : activeAct === 2
          ? boundaryTriggered
            ? "Boundary freeze · Stopped on public billing"
            : "Brewing live · Real user signal > upfront polish"
          : activeAct === 3
            ? chatPartner === "claire"
              ? "@claire’s Ivory Cup · Speed & signal > polish"
              : chatPartner === "david"
                ? "@david’s Ink Cup · Day-1 trust > speed"
                : "Two cups · Same link, zero impersonation"
            : "Ready to Brew across your Agents";

  const liveTableBeans = (featuredTable?.beans ?? []).filter(
    (b) => !b.supersededByBeanId,
  );
  const featuredTitle =
    featuredTable?.sourceTitle ??
    featuredTable?.normalizedUrl ??
    "Shipping Fast Without Losing Trust";

  return (
    <div ref={scopeRef} className="cc-split-shell">
      {/* =====================================================================
          LEFT 46%: PURE SOLID EDITORIAL READING STAGE (AAA CONTRAST, ZERO NOISE)
          ===================================================================== */}
      <div className="cc-story-column">
        {/* -----------------------------------------------------------------
            CUT 01 · THE PROBLEM — "Your AI knows everything. Except how you decide."
            ----------------------------------------------------------------- */}
        <section
          id="cut-problem"
          className="cc-cut cc-cut-hero"
          aria-label="The Problem"
        >
          <div className="cc-cut-inner">
            <span className="cc-cut-kicker">01 / THE PROBLEM</span>

            <h1
              ref={heroHeadingRef}
              aria-label="Your AI knows everything. Except how you decide."
              className="cc-h1"
            >
              Your AI knows everything.
              <br />
              <span className="cc-accent-ink">Except how you decide.</span>
            </h1>

            <p className="cc-lead">
              Every new chat starts from zero. You correct your AI today—and
              tomorrow, in a new thread or another tool, it forgets your
              standards and hedges again.
            </p>

            {/* Real relatable chat pain (zero coffee jargon yet!) */}
            <div className="cc-chat-card" aria-label="Example generic AI answer">
              <div className="cc-chat-turn">
                <span className="cc-chat-role">YOU ASK</span>
                <p className="cc-chat-user-msg">
                  “Should we polish this for 2 weeks or show a rough draft to 5
                  users today?”
                </p>
              </div>
              <div className="cc-chat-divider" />
              <div className="cc-chat-turn">
                <div className="cc-chat-head-row">
                  <span className="cc-chat-role">GENERIC AI REPLY</span>
                  <span className="cc-tag-muted">No standard plugged in</span>
                </div>
                <p className="cc-chat-hedge-msg">
                  “It depends on your goals and timeline. Shipping early brings
                  faster feedback, while polishing reduces risk. Consider your
                  team’s bandwidth…”
                </p>
              </div>
            </div>

            <div className="cc-btn-row">
              <button
                type="button"
                className="cc-btn-brand"
                onClick={() => void copyStartPrompt("hero")}
              >
                {copiedHeroPrompt
                  ? "Copied — paste into any Agent ✓"
                  : "Copy prompt to start in your Agent"}
              </button>
              <button
                type="button"
                className="cc-btn-ghost"
                onClick={() => jumpToChapter("roast")}
              >
                See how 1 correction fixes this ↓
              </button>
            </div>

            {showPrompt ? (
              <div className="cc-prompt-box">
                <div className="cc-prompt-box-head">
                  <span>Paste into any MCP-compatible Agent</span>
                  <button
                    type="button"
                    className="cc-inline-btn"
                    onClick={() => setShowPrompt(false)}
                  >
                    Hide
                  </button>
                </div>
                <div className="prompt-code-wrap">
                  <CodeBlock code={startPrompt} language="text" />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* -----------------------------------------------------------------
            CUT 02 · CAPTURE ONCE (ROAST) — "Correct your AI once. Keep it as a 2-line Bean."
            ----------------------------------------------------------------- */}
        <section
          id="cut-roast"
          className="cc-cut"
          aria-label="Capture once as a Bean"
        >
          <div className="cc-cut-inner" data-cc-reveal="">
            <span className="cc-cut-kicker">02 / CAPTURE ONCE · ROAST</span>

            <h2 className="cc-h2">
              Correct your AI once.
              <br />
              <span className="cc-accent-ink">Keep it as a 2-line Bean.</span>
            </h2>

            <p className="cc-lead">
              Skip giant prompt docs. When you push back on a real decision,
              save that single standard as a structured{" "}
              <strong>Bean</strong>—what you put first, and where the rule
              stops. Nothing is saved until you confirm it.
            </p>

            {/* Clear Before -> After Distillation Card */}
            <div className="cc-distill-stack">
              <div className="cc-chat-card cc-chat-card-compact">
                <span className="cc-chat-role">YOU PUSH BACK ONCE</span>
                <p className="cc-chat-user-msg">
                  “No — show an honest draft to 5 real people first. Only slow
                  down when billing or privacy is on the line.”
                </p>
              </div>

              <div className="cc-distill-arrow" aria-hidden="true">
                ↓ Distilled into 1 confirmed Bean
              </div>

              <div
                className="cc-bean-card"
                data-confirmed={roastConfirmed ? "true" : "false"}
              >
                <div className="cc-chat-head-row">
                  <span className="cc-tag-brand">
                    {roastConfirmed
                      ? "Confirmed Bean ✓ · Private by default"
                      : "Draft Bean · Waiting for your confirmation"}
                  </span>
                </div>

                <div className="cc-bean-rows">
                  <div className="cc-bean-row cc-bean-row-priority">
                    <span className="cc-chat-role">
                      WHAT YOU PUT FIRST (TRADE-OFF)
                    </span>
                    <p>Real user signal over upfront polish.</p>
                  </div>
                  <div className="cc-bean-row cc-bean-row-boundary">
                    <span className="cc-chat-role">
                      WHERE IT STOPS (BOUNDARY)
                    </span>
                    <p>Never skip checks on billing or privacy.</p>
                  </div>
                </div>

                <div className="cc-bean-card-foot">
                  <button
                    type="button"
                    className={
                      roastConfirmed ? "cc-btn-neutral" : "cc-btn-dark"
                    }
                    onClick={() => {
                      setRoastConfirmed((prev) => !prev);
                      triggerRipple();
                    }}
                  >
                    {roastConfirmed
                      ? "Confirmed & saved ✓ (Click to reset)"
                      : "Confirm & keep this Bean"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------------
            CUT 03 · APPLY EVERYWHERE (BREW) — "One standard. Every AI respects your line."
            ----------------------------------------------------------------- */}
        <section
          id="cut-brew"
          className="cc-cut"
          aria-label="Apply across your Agents"
        >
          <div className="cc-cut-inner" data-cc-reveal="">
            <span className="cc-cut-kicker">03 / APPLY EVERYWHERE · BREW</span>

            <h2 className="cc-h2">
              One standard.
              <br />
              <span className="cc-accent-ink">
                Every AI respects your line.
              </span>
            </h2>

            <p className="cc-lead">
              Your confirmed Beans flow into every MCP-compatible Agent
              automatically—pushing forward when the situation fits, and
              stopping cold the moment a task hits your boundary.
            </p>

            {/* Dead-simple 2-scenario interactive comparison */}
            <div
              className="cc-scenario-grid"
              role="radiogroup"
              aria-label="Test how your AI applies your Bean"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!boundaryTriggered}
                className="cc-scenario-btn"
                data-active={!boundaryTriggered}
                onClick={() => {
                  setBoundaryTriggered(false);
                  triggerRipple();
                }}
              >
                <span className="cc-scenario-title">Internal beta draft</span>
                <span className="cc-scenario-sub">
                  “Ship a rough beta to 5 users today?”
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={boundaryTriggered}
                className="cc-scenario-btn"
                data-active={boundaryTriggered}
                data-alert={boundaryTriggered}
                onClick={() => {
                  setBoundaryTriggered(true);
                  triggerRipple();
                }}
              >
                <span className="cc-scenario-title">Public billing launch</span>
                <span className="cc-scenario-sub">
                  “Ship billing fast to gather feedback?”
                </span>
              </button>
            </div>

            <div
              className="cc-verdict-card"
              data-state={boundaryTriggered ? "boundary" : "brewed"}
              aria-live="polite"
            >
              <div className="cc-chat-head-row">
                <span className="cc-chat-role">YOUR AGENT REPLIES</span>
                <span
                  className={
                    boundaryTriggered ? "cc-tag-alert" : "cc-tag-brand"
                  }
                >
                  {boundaryTriggered
                    ? "Stopped at your boundary"
                    : "Bean applied · Signal > polish"}
                </span>
              </div>
              <p className="cc-verdict-title">{brewVerdict}</p>
              <p className="cc-verdict-body">
                {brewStream.text}
                {brewStream.streaming ? (
                  <span className="cc-stream-cursor" aria-hidden="true" />
                ) : null}
              </p>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------------
            CUT 04 · WHY IT'S CALLED COFFEE CHAT — "Two people. Same link."
            ----------------------------------------------------------------- */}
        <section
          id="cut-coffee-chat"
          className="cc-cut"
          aria-label="Compare perspectives in a Coffee Chat"
        >
          <div className="cc-cut-inner" data-cc-reveal="">
            <span className="cc-cut-kicker">
              04 / WHY IT’S CALLED COFFEE CHAT
            </span>

            <h2 className="cc-h2">
              Two people. Same link.
              <br />
              <span className="cc-accent-ink">
                Sit across from how they think.
              </span>
            </h2>

            <p className="cc-lead">
              When someone shares a Bean publicly on a Table, your Agent can
              sit across from their confirmed standards—weighing their
              trade-offs next to yours with clear attribution and zero
              impersonation.
            </p>

            {/* Clean 3-tab selector driving the 90deg overhead two-cup dolly */}
            <div
              className="cc-segment-bar"
              role="radiogroup"
              aria-label="Choose whose cup to view"
            >
              <button
                type="button"
                role="radio"
                aria-checked={chatPartner === "claire"}
                className="cc-segment-btn"
                data-active={chatPartner === "claire"}
                onClick={() => {
                  setChatPartner("claire");
                  triggerRipple();
                }}
              >
                @claire · Ivory Cup
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={chatPartner === "david"}
                className="cc-segment-btn"
                data-active={chatPartner === "david"}
                onClick={() => {
                  setChatPartner("david");
                  triggerRipple();
                }}
              >
                @david · Ink Cup
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={chatPartner === "both"}
                className="cc-segment-btn"
                data-active={chatPartner === "both"}
                onClick={() => {
                  setChatPartner("both");
                  triggerRipple();
                }}
              >
                Compare both
              </button>
            </div>

            <div className="cc-table-cards" aria-live="polite">
              {chatPartner === "claire" || chatPartner === "both" ? (
                <article className="cc-voice-card">
                  <div className="cc-chat-head-row">
                    <span className="cc-chat-role">@CLAIRE · IVORY CUP</span>
                    <span className="cc-tag-brand">Based on @claire’s Beans</span>
                  </div>
                  <p className="cc-voice-quote">
                    “Show an honest draft to 5 real people this afternoon—polishing
                    the wrong workflow wastes a month.”
                  </p>
                  <p className="cc-voice-meta">
                    <strong>Puts first:</strong> Speed &amp; real signal over
                    upfront polish · <strong>Stops at:</strong> Public brand
                    launches
                  </p>
                </article>
              ) : null}

              {chatPartner === "david" || chatPartner === "both" ? (
                <article className="cc-voice-card cc-voice-card-ink">
                  <div className="cc-chat-head-row">
                    <span className="cc-chat-role">@DAVID · INK CUP</span>
                    <span className="cc-tag-brand">Based on @david’s Beans</span>
                  </div>
                  <p className="cc-voice-quote">
                    “Early users forgive a rough layout, never a broken promise
                    on billing or privacy—finish trust-critical paths first.”
                  </p>
                  <p className="cc-voice-meta">
                    <strong>Puts first:</strong> Durable day-1 trust over fast
                    demos · <strong>Stops at:</strong> Throwaway sample
                    prototypes
                  </p>
                </article>
              ) : null}
            </div>

            {/* Live Table link from real database */}
            <div className="cc-live-row">
              <div>
                <span className="cc-chat-role">ON THE TABLE RIGHT NOW</span>
                <p className="cc-live-row-title">
                  {featuredTitle}
                  <span>
                    {" "}
                    ·{" "}
                    {liveTableBeans.length > 0
                      ? `${liveTableBeans.length} confirmed Beans`
                      : "Open shared Table"}
                  </span>
                </p>
              </div>
              <Link
                href={
                  featuredTable
                    ? `/sources/${featuredTable.originId}`
                    : "/sources"
                }
                className="cc-text-cta"
              >
                Sit at this Table →
              </Link>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------------
            CUT 05 · START IN 30 SECONDS
            ----------------------------------------------------------------- */}
        <section
          id="cut-start"
          className="cc-cut cc-cut-closer"
          aria-label="Start using Coffee Chat"
        >
          <div className="cc-cut-inner" data-cc-reveal="">
            <span className="cc-cut-kicker">05 / START IN 30 SECONDS</span>

            <h2 className="cc-h2">
              Nothing is unimportant.
              <br />
              <span className="cc-accent-ink">
                Bring your Taste to every Agent.
              </span>
            </h2>

            <ol className="cc-step-list">
              <li>
                <span className="cc-step-num">01</span>
                <div>
                  <strong>Connect once</strong> — Paste one prompt into your
                  Agent (OAuth + MCP, zero server AI).
                </div>
              </li>
              <li>
                <span className="cc-step-num">02</span>
                <div>
                  <strong>Roast private Beans</strong> — Save real calls as a
                  2-line Trade-off &amp; Boundary, private by default.
                </div>
              </li>
              <li>
                <span className="cc-step-num">03</span>
                <div>
                  <strong>Brew &amp; Coffee Chat</strong> — Reuse your standards
                  everywhere, or sit at public Tables to compare perspectives.
                </div>
              </li>
            </ol>

            <div className="cc-btn-row">
              <button
                type="button"
                className="cc-btn-brand"
                onClick={() => void copyStartPrompt("closer")}
              >
                {copiedCloserPrompt
                  ? "Copied — paste into any Agent ✓"
                  : "Copy start prompt"}
              </button>
              <button
                type="button"
                className="cc-btn-neutral"
                onClick={() =>
                  router.push(
                    signedIn ? "/me?compose=1" : "/signin?returnTo=/me",
                  )
                }
              >
                Roast a private Bean
              </button>
            </div>

            <nav className="cc-closer-nav" aria-label="Explore workspace">
              <Link href="/sources" className="cc-text-cta">
                Browse live Tables →
              </Link>
              <Link href="/connect" className="cc-text-cta">
                Brew Setup →
              </Link>
              <Link
                href={signedIn ? "/me" : "/signin?returnTo=/me"}
                className="cc-text-cta"
              >
                My Roastery →
              </Link>
            </nav>
          </div>
        </section>
      </div>

      {/* =====================================================================
          RIGHT 54%: STICKY FULL-BLEED ROBOT-ARM COFFEE CINEMA VIEWPORT
          (Pure dramatic visuals — zero messy floating paragraphs over photos!)
          ===================================================================== */}
      <aside
        className="cc-cinema-column"
        aria-label="Live Coffee Chat motion-control visual stage"
      >
        <div
          className="cc-cinema-frame"
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
        >
          <CoffeeWorldStage
            roastConfirmed={roastConfirmed}
            boundaryTriggered={boundaryTriggered}
            chatPartner={chatPartner}
            holding={holding}
            rippleNonce={rippleNonce}
            onActChange={setActiveAct}
          />

          {/* Subtle optical viewfinder corners */}
          <span className="cc-vf-corner cc-vf-tl" aria-hidden="true" />
          <span className="cc-vf-corner cc-vf-tr" aria-hidden="true" />
          <span className="cc-vf-corner cc-vf-bl" aria-hidden="true" />
          <span className="cc-vf-corner cc-vf-br" aria-hidden="true" />

          {/* Top-right solid frosted Cinema Camera Slate */}
          <div className="cc-cinema-slate" aria-hidden="true">
            <span
              className="cc-slate-dot"
              data-alert={boundaryTriggered && activeAct === 2}
            />
            <span>{cameraSlate}</span>
          </div>

          {/* Bottom bar: 1 clean plain-language visual caption + compact chapter/reel rail */}
          <div className="cc-cinema-dock">
            <div className="cc-cinema-caption" aria-live="polite">
              <span
                className="cc-slate-dot"
                data-alert={boundaryTriggered && activeAct === 2}
                aria-hidden="true"
              />
              <span>{cinemaCaption}</span>
            </div>

            <nav className="cc-cinema-rail" aria-label="Story chapters">
              {CHAPTERS.map((chap, idx) => {
                const isCurrent = activeAct === idx;
                return (
                  <button
                    key={chap.id}
                    type="button"
                    className="cc-rail-step"
                    data-active={isCurrent}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Jump to ${chap.code} ${chap.label}`}
                    onClick={() => {
                      if (reelPlaying) stopReel();
                      jumpToChapter(chap.id);
                    }}
                  >
                    {chap.code}
                  </button>
                );
              })}
              <button
                type="button"
                className="cc-rail-reel"
                data-playing={reelPlaying}
                aria-pressed={reelPlaying}
                aria-label={
                  reelPlaying ? "Stop camera reel" : "Play camera reel"
                }
                onClick={toggleReel}
              >
                {reelPlaying ? "■ STOP" : "▶ REEL"}
              </button>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}
