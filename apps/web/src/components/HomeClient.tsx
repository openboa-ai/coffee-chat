"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { Button } from "@openboa/yogurt/button";
import { CodeBlock } from "@openboa/yogurt/code-block";
import type {
  BeanDetail,
  HydratedShelfRef,
  PublicPersonCard,
} from "@coffee-chat/core";
import type {
  StageChatPartner,
  StageRoastMode,
} from "@/lib/coffee-scene/engine";
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

const CHAPTERS = [
  { id: "taste-gap", code: "01", label: "Taste Gap" },
  { id: "roast", code: "02", label: "Roast" },
  { id: "brew", code: "03", label: "Brew" },
  { id: "coffee-chat", code: "04", label: "Coffee Chat" },
  { id: "start", code: "05", label: "Pull Up a Chair" },
] as const;

const HERO_MODES: Array<{
  id: StageRoastMode;
  label: string;
  status: string;
  verdict: string;
  rule: string;
  boundary: string;
}> = [
  {
    id: "decaf",
    label: "No Bean",
    status: "50 / 50 hedge",
    verdict: "“It depends on your goals and constraints…”",
    rule: "No Taste plugged in",
    boundary: "Generic pros & cons with no priority applied",
  },
  {
    id: "growth",
    label: "Growth Roast",
    status: "Bean applied",
    verdict: "Hire the fast learner.",
    rule: "Ownership & learning speed > exact prior playbooks",
    boundary: "Except when day-1 regulatory certification is required",
  },
  {
    id: "craft",
    label: "Specialist Roast",
    status: "Bean applied",
    verdict: "Hire the proven specialist.",
    rule: "Day-1 domain mastery > broad adaptability",
    boundary: "Except when role scope shifts every quarter",
  },
];

const ROAST_SCENARIOS = [
  {
    id: "draft",
    chip: "Draft before polish",
    agentGuess:
      "Let’s refine onboarding copy and add 3 extra configuration toggles before showing users.",
    userPushback:
      "No — show an honest draft to 5 real people before polishing.",
    beanTitle: "Show an honest draft to 5 real people before polishing",
    tradeoff: "Fast real-world feedback over upfront perfection.",
    boundary: "Public brand launches or irreversible customer commitments.",
  },
  {
    id: "trust",
    chip: "No billing shortcuts",
    agentGuess:
      "We can mock edge-case refund handling for now and patch it after launch week.",
    userPushback:
      "Never ship a shortcut that touches money or customer privacy.",
    beanTitle: "Never ship a shortcut that touches money or privacy",
    tradeoff: "Durable customer trust on day one over faster early demos.",
    boundary: "Throwaway visual prototypes using sample data only.",
  },
  {
    id: "hiring",
    chip: "Hire fast learners",
    agentGuess:
      "Filter candidates strictly for 5+ years of exact industry playbook experience.",
    userPushback:
      "Hire people who talk to customers directly and own fuzzy problems.",
    beanTitle: "Hire fast learners over ready-made playbooks",
    tradeoff: "Ownership and learning speed over exact prior industry background.",
    boundary: "Roles requiring day-one regulatory certification.",
  },
] as const;

export function HomeClient({
  signedIn,
  mcpUrl,
  totalCorpusPublicCount,
  featuredTable,
}: HomeClientProps) {
  const router = useRouter();
  const scopeRef = useRef<HTMLDivElement>(null);
  const heroHeadingRef = useRef<HTMLHeadingElement>(null);

  // Interactive 3D & Story State
  const [activeAct, setActiveAct] = useState(0);
  const [roastMode, setRoastMode] = useState<StageRoastMode>("growth");
  const [holding, setHolding] = useState(false);
  const [rippleNonce, setRippleNonce] = useState(0);

  // Act 02: Interactive Roast-a-Bean
  const [roastScenarioIdx, setRoastScenarioIdx] = useState(0);
  const [roastConfirmed, setRoastConfirmed] = useState(false);

  // Act 03: Live Brew + Boundary test
  const [brewActive, setBrewActive] = useState(true);
  const [boundaryTriggered, setBoundaryTriggered] = useState(false);

  // Act 04: Two-Cup Coffee Chat
  const [chatPartner, setChatPartner] = useState<StageChatPartner>("claire");

  // Copy prompt state (independent per CTA so only the clicked button flips)
  const [copiedHeroPrompt, setCopiedHeroPrompt] = useState(false);
  const [copiedCloserPrompt, setCopiedCloserPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const startPrompt = `Connect to Coffee Chat at ${mcpUrl} (sign in when prompted). Once connected, help me Roast my first private Bean from a real decision or article I share with you—ask what mattered more and when the rule stops applying, and wait for my confirmation before saving.`;

  const triggerRipple = () => setRippleNonce((n) => n + 1);

  const selectRoastMode = (mode: StageRoastMode) => {
    setRoastMode(mode);
    triggerRipple();
  };

  const handleHoldBurst = () => {
    setRoastMode((prev) =>
      prev === "decaf" ? "growth" : prev === "growth" ? "craft" : "growth",
    );
  };

  const copyStartPrompt = async (source: "hero" | "closer") => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(startPrompt);
      }
    } catch {
      // Clipboard may be blocked in headless or restricted browsers.
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

  // Lenis smooth inertia scroll synced cleanly with GSAP ScrollTrigger
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
        lenis.scrollTo(target, { duration: 1.05 });
      }
    };
    window.addEventListener("coffee:scroll-to", onScrollTo);

    return () => {
      window.removeEventListener("coffee:scroll-to", onScrollTo);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // GSAP SplitText hero entrance + scroll-triggered act choreography
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
          yPercent: 108,
          opacity: 0,
          duration: 0.9,
          stagger: 0.015,
          ease: "power4.out",
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-cc-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 36,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
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
      document.getElementById(`act-${id}`)?.scrollIntoView({ behavior: "auto" });
      return;
    }
    window.dispatchEvent(
      new CustomEvent("coffee:scroll-to", { detail: `#act-${id}` }),
    );
  };

  const activeHero =
    HERO_MODES.find((m) => m.id === roastMode) ?? HERO_MODES[1]!;
  const activeScenario =
    ROAST_SCENARIOS[roastScenarioIdx] ?? ROAST_SCENARIOS[0];
  const currentChapter = CHAPTERS[activeAct] ?? CHAPTERS[0];

  const liveTelemetry = holding
    ? "HOLDING · VORTEX"
    : activeAct === 0
      ? roastMode === "decaf"
        ? "NO BEAN · DECAF"
        : roastMode === "craft"
          ? "SPECIALIST ROAST"
          : "GROWTH ROAST"
      : activeAct === 1
        ? roastConfirmed
          ? "BEAN ROASTED ✓"
          : "RAW TAKE · UNCONFIRMED"
        : activeAct === 2
          ? boundaryTriggered
            ? "BOUNDARY · HELD BACK"
            : brewActive
              ? "POURING · TASTE ON"
              : "PAUSED · TASTE OFF"
          : activeAct === 3
            ? chatPartner === "claire"
              ? "CUP 01 · @CLAIRE"
              : chatPartner === "david"
                ? "CUP 02 · @DAVID"
                : "TWO CUPS · TABLE"
            : "ROASTERY READY";

  const liveTableBeans = (featuredTable?.beans ?? []).filter(
    (b) => !b.supersededByBeanId,
  );
  const featuredTitle =
    featuredTable?.sourceTitle ??
    featuredTable?.normalizedUrl ??
    "Shipping Fast Without Losing Trust";

  return (
    <div ref={scopeRef} className="cc-spatial-page">
      {/* Persistent Full-Viewport PBR 3D Coffee World */}
      <CoffeeWorldStage
        roastMode={roastMode}
        roastConfirmed={roastConfirmed}
        brewActive={brewActive}
        boundaryTriggered={boundaryTriggered}
        chatPartner={chatPartner}
        holding={holding}
        rippleNonce={rippleNonce}
        onActChange={setActiveAct}
        onHoldBurst={handleHoldBurst}
      />

      {/* Frameless Architectural Corner Reticles */}
      <div className="cc-reticles" aria-hidden="true">
        <span className="cc-reticle cc-reticle-tl" />
        <span className="cc-reticle cc-reticle-tr" />
        <span className="cc-reticle cc-reticle-bl" />
        <span className="cc-reticle cc-reticle-br" />
      </div>

      {/* Bottom Spatial HUD — Active Chapter + 5-Act Jump Rail + Live Physics Telemetry */}
      <aside className="cc-spatial-hud" aria-label="Story progress">
        <div className="cc-hud-chapter">
          <span className="cc-hud-code">{currentChapter.code}</span>
          <span className="cc-hud-slash">/</span>
          <span>{currentChapter.label}</span>
        </div>

        <nav className="cc-hud-rail" aria-label="Landing chapters">
          {CHAPTERS.map((chap, idx) => {
            const isCurrent = activeAct === idx;
            return (
              <button
                key={chap.id}
                type="button"
                className="cc-hud-step"
                data-active={isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Jump to chapter ${chap.code} ${chap.label}`}
                onClick={() => jumpToChapter(chap.id)}
              >
                <span className="cc-hud-bar" />
                <span className="cc-hud-step-code">{chap.code}</span>
              </button>
            );
          })}
        </nav>

        <div className="cc-hud-telemetry">
          <span
            className="cc-hud-dot"
            data-alert={boundaryTriggered && activeAct === 2}
            aria-hidden="true"
          />
          <span>{liveTelemetry}</span>
        </div>
      </aside>

      {/* =====================================================================
          ACT 01 — THE TASTE GAP (Above the Fold)
          ===================================================================== */}
      <section
        id="act-taste-gap"
        className="cc-act cc-act-hero"
        aria-label="Give your Agents your Taste"
      >
        <div className="cc-act-inner">
          <div className="cc-act-corridor">
            <div className="cc-act-kicker">01 // THE TASTE GAP</div>

            <h1
              ref={heroHeadingRef}
              aria-label="Agents know everything. Give them your Taste."
              className="cc-display-h1"
            >
              Agents know everything.
              <br />
              <span className="cc-display-accent">Give them your Taste.</span>
            </h1>

            <p className="cc-act-lead">
              Without your judgment, every Agent hedges. Drop one confirmed
              Bean into the cup and feel its answer lock onto what you actually
              put first.
            </p>

            {/* Live 3D Roast Switcher — physically changes 3D liquid, ripples & Agent answer */}
            <div className="cc-glass-panel" data-mode={roastMode}>
              <div
                className="cc-pill-group"
                role="radiogroup"
                aria-label="Drop a Bean into the 3D cup"
              >
                {HERO_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={roastMode === m.id}
                    className="cc-pill-btn"
                    data-active={roastMode === m.id}
                    onClick={() => selectRoastMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="cc-verdict-live" key={activeHero.id}>
                <div className="cc-verdict-meta">
                  <span>Agent reply</span>
                  <span className="cc-verdict-chip" data-mode={activeHero.id}>
                    {activeHero.status}
                  </span>
                </div>
                <p className="cc-verdict-headline">{activeHero.verdict}</p>
                <p className="cc-verdict-rule">
                  <strong>{activeHero.rule}</strong> · {activeHero.boundary}
                </p>
              </div>
            </div>

            <div className="cc-act-actions">
              <Button
                emphasis="filled"
                tone="brand"
                size="regular"
                onClick={() => void copyStartPrompt("hero")}
              >
                {copiedHeroPrompt
                  ? "Copied — paste into any Agent"
                  : "Copy prompt to start in your Agent"}
              </Button>

              <button
                type="button"
                className="cc-hold-control"
                aria-pressed={holding}
                aria-label="Hold to swirl beans and pour a fresh Bean into the cup"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setHolding(true);
                }}
                onPointerUp={() => setHolding(false)}
                onPointerLeave={() => setHolding(false)}
                onBlur={() => setHolding(false)}
                onKeyDown={(e) => {
                  if (e.code === "Space" || e.code === "Enter") {
                    e.preventDefault();
                    setHolding(true);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.code === "Space" || e.code === "Enter") {
                    setHolding(false);
                  }
                }}
              >
                <span className="cc-hold-ring" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.22"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="var(--yg-brand-ink)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      className="cc-hold-ring-fill"
                    />
                  </svg>
                  <span className="cc-hold-core" />
                </span>
                <span>{holding ? "Release to pour…" : "Hold to pour"}</span>
              </button>
            </div>

            {showPrompt ? (
              <div className="cc-prompt-drawer">
                <div className="cc-prompt-drawer-head">
                  <span>Paste into any MCP-compatible Agent</span>
                  <button
                    type="button"
                    className="cc-text-link-btn"
                    onClick={() => setShowPrompt(false)}
                  >
                    Hide
                  </button>
                </div>
                <div className="prompt-code-wrap">
                  <CodeBlock
                    code={startPrompt}
                    language="text"
                    onCopy={async (txt) => {
                      if (navigator.clipboard) {
                        await navigator.clipboard.writeText(txt);
                      }
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* =====================================================================
          ACT 02 — ROAST A BEAN (Zoom on Macro 3D Roasted Bean)
          ===================================================================== */}
      <section
        id="act-roast"
        className="cc-act"
        aria-label="Roast one real correction into a Bean"
      >
        <div className="cc-act-inner">
          <div className="cc-act-corridor" data-cc-reveal="">
            <div className="cc-act-kicker">02 // ROAST A BEAN</div>

            <h2 className="cc-display-h2">
              Correct your Agent once.
              <br />
              <span className="cc-display-accent">Keep it as a Bean.</span>
            </h2>

            <p className="cc-act-lead">
              A Bean isn’t a messy note or vague vibe. It distills one real
              call into <strong>what mattered more</strong> and{" "}
              <strong>when the rule stops applying</strong> — saved privately
              only when you confirm.
            </p>

            <div className="cc-glass-panel">
              <div
                className="cc-pill-group"
                role="tablist"
                aria-label="Pick a real correction to Roast"
              >
                {ROAST_SCENARIOS.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    role="tab"
                    aria-selected={roastScenarioIdx === idx}
                    className="cc-pill-btn"
                    data-active={roastScenarioIdx === idx}
                    onClick={() => {
                      setRoastScenarioIdx(idx);
                      setRoastConfirmed(false);
                      triggerRipple();
                    }}
                  >
                    {sc.chip}
                  </button>
                ))}
              </div>

              <div className="cc-dialogue-stack">
                <div className="cc-bubble cc-bubble-agent">
                  <span className="cc-bubble-who">Agent default</span>
                  <p>{activeScenario.agentGuess}</p>
                </div>
                <div className="cc-bubble cc-bubble-user">
                  <span className="cc-bubble-who">You push back</span>
                  <p>“{activeScenario.userPushback}”</p>
                </div>
              </div>

              <div
                className="cc-bean-preview"
                data-confirmed={roastConfirmed}
              >
                <div className="cc-bean-preview-head">
                  <span className="cc-bean-pill">
                    {roastConfirmed
                      ? "Confirmed Bean · Private"
                      : "Draft Bean · Waiting for you"}
                  </span>
                  <Button
                    emphasis={roastConfirmed ? "soft" : "filled"}
                    tone={roastConfirmed ? "neutral" : "brand"}
                    size="compact"
                    onClick={() => {
                      setRoastConfirmed((prev) => !prev);
                      triggerRipple();
                    }}
                  >
                    {roastConfirmed ? "Roasted ✓" : "Confirm & Roast Bean"}
                  </Button>
                </div>

                <p className="cc-bean-preview-title">
                  {activeScenario.beanTitle}
                </p>

                <div className="cc-bean-preview-cols">
                  <div>
                    <span className="cc-mini-label">What mattered more</span>
                    <p>{activeScenario.tradeoff}</p>
                  </div>
                  <div>
                    <span className="cc-mini-label">Except when</span>
                    <p>{activeScenario.boundary}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ACT 03 — BREW IN YOUR AGENTS (Glossy 3D Espresso Pour + Boundary Test)
          ===================================================================== */}
      <section
        id="act-brew"
        className="cc-act"
        aria-label="Brew your Taste in every Agent"
      >
        <div className="cc-act-inner">
          <div className="cc-act-corridor" data-cc-reveal="">
            <div className="cc-act-kicker">03 // BREW IN YOUR AGENTS</div>

            <h2 className="cc-display-h2">
              Pour once.
              <br />
              <span className="cc-display-accent">
                Every Agent respects your line.
              </span>
            </h2>

            <p className="cc-act-lead">
              Your confirmed Beans travel across every MCP-compatible Agent you
              use — applying your trade-offs when they fit, and stepping back
              automatically when a boundary triggers.
            </p>

            <div className="cc-glass-panel">
              <div className="cc-brew-controls">
                <div className="cc-control-cluster">
                  <span className="cc-mini-label">Your Taste</span>
                  <div className="cc-pill-group">
                    <button
                      type="button"
                      className="cc-pill-btn"
                      data-active={brewActive}
                      onClick={() => {
                        setBrewActive(true);
                        triggerRipple();
                      }}
                    >
                      Brew ON
                    </button>
                    <button
                      type="button"
                      className="cc-pill-btn"
                      data-active={!brewActive}
                      onClick={() => {
                        setBrewActive(false);
                        triggerRipple();
                      }}
                    >
                      Brew OFF
                    </button>
                  </div>
                </div>

                <div className="cc-control-cluster">
                  <span className="cc-mini-label">Test the Boundary</span>
                  <div className="cc-pill-group">
                    <button
                      type="button"
                      className="cc-pill-btn"
                      data-active={!boundaryTriggered}
                      onClick={() => {
                        setBoundaryTriggered(false);
                        setBrewActive(true);
                        triggerRipple();
                      }}
                    >
                      Internal beta
                    </button>
                    <button
                      type="button"
                      className="cc-pill-btn"
                      data-active={boundaryTriggered}
                      onClick={() => {
                        setBoundaryTriggered(true);
                        setBrewActive(true);
                        triggerRipple();
                      }}
                    >
                      Public billing launch
                    </button>
                  </div>
                </div>
              </div>

              <div className="cc-dialogue-stack">
                <div className="cc-bubble cc-bubble-user">
                  <span className="cc-bubble-who">You ask your Agent</span>
                  <p>
                    {boundaryTriggered
                      ? "Should we ship the new public billing launch early to gather feedback fast?"
                      : "Should we put our internal beta draft in front of 5 users today or polish for 2 more weeks?"}
                  </p>
                </div>

                <div
                  className="cc-bubble cc-bubble-agent"
                  data-state={
                    !brewActive
                      ? "off"
                      : boundaryTriggered
                        ? "boundary"
                        : "brewed"
                  }
                >
                  <div className="cc-bubble-head">
                    <span className="cc-bubble-who">Your Agent</span>
                    <span className="cc-citation-tag">
                      {!brewActive
                        ? "No Bean loaded"
                        : boundaryTriggered
                          ? "Boundary triggered · Bean held back"
                          : "Brewed · Draft before polish"}
                    </span>
                  </div>
                  <p>
                    {!brewActive
                      ? "Both options have trade-offs. Shipping early gives faster feedback, while polishing reduces risk. Consider your team's capacity and user expectations."
                      : boundaryTriggered
                        ? "Hold back speed here. Your Bean explicitly stops applying on public billing launches — verify edge cases and billing integrity before releasing."
                        : "Put the labeled draft in front of 5 real beta users today. You prioritize real-world signal over upfront polish, and this is a reversible internal beta."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ACT 04 — TWO-CUP COFFEE CHAT (Two 3D Cups Across One Shared Table)
          ===================================================================== */}
      <section
        id="act-coffee-chat"
        className="cc-act"
        aria-label="Two cups, same link, real Coffee Chat"
      >
        <div className="cc-act-inner">
          <div className="cc-act-corridor" data-cc-reveal="">
            <div className="cc-act-kicker">04 // COFFEE CHAT</div>

            <h2 className="cc-display-h2">
              Two cups. Same link.
              <br />
              <span className="cc-display-accent">Real Coffee Chat.</span>
            </h2>

            <p className="cc-act-lead">
              When people put a Bean On the Table, your Agent can sit across
              from their confirmed Taste — comparing what each person puts
              first with clear attribution and zero fake impersonation.
            </p>

            <div className="cc-glass-panel">
              <div
                className="cc-pill-group"
                role="radiogroup"
                aria-label="Choose whose cup to Coffee Chat with"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={chatPartner === "claire"}
                  className="cc-pill-btn"
                  data-active={chatPartner === "claire"}
                  onClick={() => {
                    setChatPartner("claire");
                    triggerRipple();
                  }}
                >
                  Coffee Chat with @claire
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chatPartner === "david"}
                  className="cc-pill-btn"
                  data-active={chatPartner === "david"}
                  onClick={() => {
                    setChatPartner("david");
                    triggerRipple();
                  }}
                >
                  Coffee Chat with @david
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chatPartner === "both"}
                  className="cc-pill-btn"
                  data-active={chatPartner === "both"}
                  onClick={() => {
                    setChatPartner("both");
                    triggerRipple();
                  }}
                >
                  Compare both
                </button>
              </div>

              {chatPartner === "claire" ? (
                <div className="cc-chat-perspective" key="claire">
                  <div className="cc-perspective-head">
                    <span className="cc-cup-badge cc-cup-warm">
                      Ivory Cup · @claire
                    </span>
                    <span className="cc-citation-tag">
                      Based on @claire’s Beans
                    </span>
                  </div>
                  <p className="cc-perspective-quote">
                    “Put an honest, clearly labeled draft in front of 5 real
                    people this afternoon—polishing the wrong workflow wastes a
                    month.”
                  </p>
                  <p className="cc-verdict-rule">
                    <strong>Speed &amp; signal &gt; upfront polish</strong> ·
                    Stops at public brand launches
                  </p>
                </div>
              ) : chatPartner === "david" ? (
                <div className="cc-chat-perspective" key="david">
                  <div className="cc-perspective-head">
                    <span className="cc-cup-badge cc-cup-ink">
                      Slate Cup · @david
                    </span>
                    <span className="cc-citation-tag">
                      Based on @david’s Beans
                    </span>
                  </div>
                  <p className="cc-perspective-quote">
                    “Early users forgive a rough layout, never a broken promise
                    around billing or privacy—ship complete where trust
                    compounds.”
                  </p>
                  <p className="cc-verdict-rule">
                    <strong>Durable day-1 trust &gt; fast demos</strong> ·
                    Stops at throwaway sample-data prototypes
                  </p>
                </div>
              ) : (
                <div className="cc-dual-compare" key="both">
                  <div className="cc-dual-col">
                    <span className="cc-cup-badge cc-cup-warm">@claire</span>
                    <p>
                      Based on @claire’s Beans: optimize learning rate on
                      reversible drafts.
                    </p>
                  </div>
                  <div className="cc-dual-col">
                    <span className="cc-cup-badge cc-cup-ink">@david</span>
                    <p>
                      Based on @david’s Beans: protect trust anywhere money or
                      privacy lives.
                    </p>
                  </div>
                </div>
              )}

              {/* Live DB-backed Table preview strip */}
              {totalCorpusPublicCount > 0 && featuredTable ? (
                <div className="cc-live-table-strip">
                  <div>
                    <span className="cc-mini-label">On the Table right now</span>
                    <p className="cc-live-table-title">
                      {featuredTitle} ·{" "}
                      <span>
                        {liveTableBeans.length || featuredTable.beans.length}{" "}
                        confirmed Beans
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/sources/${featuredTable.originId}`}
                    className="cc-inline-cta-link"
                  >
                    Sit at this Table →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ACT 05 — PULL UP A CHAIR (Serene Closing Horizon)
          ===================================================================== */}
      <section
        id="act-start"
        className="cc-act cc-act-closer"
        aria-label="Start with Coffee Chat"
      >
        <div className="cc-act-inner">
          <div className="cc-act-corridor" data-cc-reveal="">
            <div className="cc-act-kicker">05 // PULL UP A CHAIR</div>

            <h2 className="cc-display-h2">
              Nothing is unimportant.
              <br />
              <span className="cc-display-accent">
                Bring your Taste to every Agent.
              </span>
            </h2>

            <p className="cc-act-lead">
              Zero server models. Private by default. Every Bean confirmed by
              you — ready to Brew across your Agents in under a minute.
            </p>

            <div className="cc-act-actions">
              <Button
                emphasis="filled"
                tone="brand"
                size="regular"
                onClick={() => void copyStartPrompt("closer")}
              >
                {copiedCloserPrompt
                  ? "Copied start prompt"
                  : "Copy start prompt"}
              </Button>

              <Button
                emphasis="soft"
                size="regular"
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
            </div>

            <div className="cc-closer-links">
              <Link href="/sources" className="cc-inline-cta-link">
                Browse live Tables →
              </Link>
              <Link href="/connect" className="cc-inline-cta-link">
                Open Brew Bar →
              </Link>
              <Link href="/me" className="cc-inline-cta-link">
                My Roastery →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
