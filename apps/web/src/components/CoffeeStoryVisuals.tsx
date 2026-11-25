"use client";

import { useEffect, useState } from "react";

export type HeroRoastMode = "decaf" | "growth" | "craft";
export type ScalePreset = "default" | "claire" | "david";
export type TableGuest = "claire" | "david";

/* ============================================================================
   SCENE 1 — HERO: WATCH A COFFEE BEAN DROP INTO YOUR AI
   ============================================================================ */

function BeanIcon({
  variant,
  size = 24,
}: {
  variant: "empty" | "light" | "dark";
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="cc-bean-svg"
    >
      <g transform="translate(14 14) rotate(-22)">
        <ellipse
          cx="0"
          cy="0"
          rx="8"
          ry="11"
          fill={
            variant === "empty"
              ? "none"
              : variant === "light"
                ? "var(--cc-cup-light)"
                : "var(--cc-cup-dark)"
          }
          stroke={
            variant === "empty" ? "var(--cc-roast-muted)" : "var(--cc-crema)"
          }
          strokeWidth={variant === "empty" ? "1.6" : "1.2"}
          strokeDasharray={variant === "empty" ? "3 2.5" : undefined}
        />
        <path
          d="M 0 -9.5 C 2.8 -3.5, -2.8 3.5, 0 9.5"
          fill="none"
          stroke={
            variant === "empty" ? "var(--cc-roast-muted)" : "var(--cc-crema)"
          }
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

const HERO_MODES: Array<{
  id: HeroRoastMode;
  label: string;
  sub: string;
  bean: "empty" | "light" | "dark";
}> = [
  { id: "decaf", label: "No Bean", sub: "Default AI", bean: "empty" },
  { id: "growth", label: "Growth Roast", sub: "Speed > Craft", bean: "light" },
  {
    id: "craft",
    label: "Specialist Roast",
    sub: "Craft > Speed",
    bean: "dark",
  },
];

const HERO_RESULTS: Record<
  HeroRoastMode,
  {
    badge: string;
    verdict: string;
    guard: string;
    tiltDeg: number;
  }
> = {
  decaf: {
    badge: "50 / 50 · No Taste",
    verdict: "“It depends…”",
    guard: "Generic pros & cons filler",
    tiltDeg: 0,
  },
  growth: {
    badge: "Growth Bean brewed",
    verdict: "Hire the fast learner.",
    guard: "Flips if day-1 cert needed",
    tiltDeg: -11,
  },
  craft: {
    badge: "Specialist Bean brewed",
    verdict: "Hire the proven specialist.",
    guard: "Flips if scope keeps shifting",
    tiltDeg: 11,
  },
};

export function HeroBeanDropStage() {
  const [mode, setMode] = useState<HeroRoastMode>("growth");
  const [userLocked, setUserLocked] = useState(false);

  // Gently cycle Decaf -> Growth -> Specialist so visitors WATCH the Bean drop in
  // without touching anything; stops immediately once the user clicks any Bean.
  useEffect(() => {
    if (userLocked) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const order: HeroRoastMode[] = ["growth", "craft", "decaf"];
    const timer = window.setInterval(() => {
      setMode((cur) => {
        const nextIdx = (order.indexOf(cur) + 1) % order.length;
        return order[nextIdx] ?? "growth";
      });
    }, 4400);

    return () => window.clearInterval(timer);
  }, [userLocked]);

  const handleSelect = (next: HeroRoastMode) => {
    setUserLocked(true);
    setMode(next);
  };

  const result = HERO_RESULTS[mode];
  const isDecaf = mode === "decaf";
  const activeIndex = mode === "decaf" ? 0 : mode === "growth" ? 1 : 2;
  // Funnel SVG start X aligned with the 3 Bean columns (16.7%, 50%, 83.3% of 360)
  const startX = activeIndex === 0 ? 60 : activeIndex === 1 ? 180 : 300;

  return (
    <div className="cc-hero-visual" data-mode={mode}>
      {/* STEP 1 VISUAL: TACTILE BEAN TRAY (TAP TO DROP A BEAN) */}
      <div
        className="cc-bean-tray"
        role="radiogroup"
        aria-label="Choose a Bean to brew in your AI"
      >
        {HERO_MODES.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              className="cc-bean-pill"
              data-active={active}
              data-variant={item.id}
              onClick={() => handleSelect(item.id)}
            >
              <BeanIcon variant={item.bean} size={26} />
              <span className="cc-bean-pill-text">
                <strong>{item.label}</strong>
                <span>{item.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* STEP 2 VISUAL: ANIMATED POUR / DROP CONDUIT INTO YOUR AI */}
      <div className="cc-drop-conduit" aria-hidden="true">
        <svg viewBox="0 0 360 72" className="cc-drop-svg">
          {/* Guide rails from each of the 3 slots converging into the AI funnel */}
          <path
            d="M 60 0 C 60 36, 180 30, 180 72"
            fill="none"
            stroke="var(--cc-linen-line)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M 180 0 L 180 72"
            fill="none"
            stroke="var(--cc-linen-line)"
            strokeWidth="1.5"
          />
          <path
            d="M 300 0 C 300 36, 180 30, 180 72"
            fill="none"
            stroke="var(--cc-linen-line)"
            strokeWidth="1.5"
          />

          {/* Active illuminated pour path */}
          {!isDecaf ? (
            <>
              <path
                key={`path-${mode}`}
                d={
                  startX === 180
                    ? "M 180 0 L 180 72"
                    : `M ${startX} 0 C ${startX} 36, 180 30, 180 72`
                }
                fill="none"
                stroke={
                  mode === "craft"
                    ? "var(--yg-brand-ink)"
                    : "var(--cc-roast)"
                }
                strokeWidth="2.5"
                strokeLinecap="round"
                className="cc-pour-stream"
              />
              {/* Dropping roasted coffee droplet travelling down the active curve */}
              <circle
                key={`drop1-${mode}`}
                r="5.5"
                fill={
                  mode === "craft"
                    ? "var(--yg-brand)"
                    : "var(--cc-cup-light)"
                }
                stroke="var(--cc-crema)"
                strokeWidth="1.5"
                className="cc-pour-drop"
              >
                <animateMotion
                  dur="1.45s"
                  repeatCount="indefinite"
                  path={
                    startX === 180
                      ? "M 180 4 L 180 68"
                      : `M ${startX} 4 C ${startX} 36, 180 30, 180 68`
                  }
                />
              </circle>
              <circle
                key={`drop2-${mode}`}
                r="3.5"
                fill="var(--cc-crema-deep)"
                className="cc-pour-drop"
              >
                <animateMotion
                  dur="1.45s"
                  begin="0.72s"
                  repeatCount="indefinite"
                  path={
                    startX === 180
                      ? "M 180 4 L 180 68"
                      : `M ${startX} 4 C ${startX} 36, 180 30, 180 68`
                  }
                />
              </circle>
            </>
          ) : (
            <circle
              cx="180"
              cy="36"
              r="4"
              fill="none"
              stroke="var(--cc-roast-muted)"
              strokeWidth="1.5"
            />
          )}

          {/* Subtle funnel entry ripple at the top of the AI window */}
          <ellipse
            cx="180"
            cy="70"
            rx={isDecaf ? 10 : 24}
            ry="3"
            fill={
              isDecaf
                ? "var(--cc-linen-line)"
                : mode === "craft"
                  ? "var(--yg-brand-ink)"
                  : "var(--cc-crema-deep)"
            }
            opacity={isDecaf ? 0.5 : 0.4}
          />
        </svg>
      </div>

      {/* STEP 3 VISUAL: MINI AI CHAT WINDOW REACTING LIVE */}
      <div className="cc-ai-window" data-mode={mode}>
        <div className="cc-ai-window-bar">
          <span className="cc-ai-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="cc-ai-hosts">ChatGPT · Claude · Cursor</span>
          <span className="cc-ai-status" data-mode={mode}>
            <i aria-hidden="true" />
            {result.badge}
          </span>
        </div>

        {/* User question bubble */}
        <div className="cc-ai-user-msg">
          <span>“Fast learner or proven specialist?”</span>
        </div>

        {/* Visual Animated Seesaw + Decisive Reply */}
        <div key={mode} className="cc-ai-reply" data-mode={mode}>
          {/* Mini visual balance seesaw inside the reply */}
          <svg
            viewBox="0 0 220 34"
            className="cc-mini-seesaw"
            aria-hidden="true"
          >
            <polygon
              points="110,20 104,31 116,31"
              fill={isDecaf ? "var(--cc-linen-line)" : "var(--cc-roast)"}
            />
            <g
              className="cc-mini-seesaw-beam"
              style={{
                transform: `rotate(${result.tiltDeg}deg)`,
                transformOrigin: "110px 20px",
              }}
            >
              <line
                x1="28"
                y1="20"
                x2="192"
                y2="20"
                stroke={
                  isDecaf
                    ? "var(--cc-roast-muted)"
                    : mode === "craft"
                      ? "var(--yg-brand-ink)"
                      : "var(--cc-roast)"
                }
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle
                cx="34"
                cy="14"
                r={mode === "growth" ? 6.5 : 4.5}
                fill={
                  mode === "growth"
                    ? "var(--cc-roast)"
                    : "var(--cc-linen-line)"
                }
              />
              <circle
                cx="186"
                cy="14"
                r={mode === "craft" ? 6.5 : 4.5}
                fill={
                  mode === "craft"
                    ? "var(--yg-brand)"
                    : "var(--cc-linen-line)"
                }
              />
            </g>
          </svg>

          <p className="cc-ai-verdict">{result.verdict}</p>

          {isDecaf ? (
            /* Visual skeleton filler bars — instantly shows generic AI fluff without prose! */
            <div className="cc-decaf-fluff" aria-hidden="true">
              <span style={{ inlineSize: "88%" }} />
              <span style={{ inlineSize: "72%" }} />
              <span style={{ inlineSize: "54%" }} />
            </div>
          ) : null}

          <div className="cc-ai-guard">
            <span className="cc-ai-guard-dot" aria-hidden="true" />
            <span>{result.guard}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SCENE 2 — ANIMATED GOLDEN BALANCE SCALE ("Nothing is unimportant.")
   ============================================================================ */

const SCALE_CONFIG: Record<
  ScalePreset,
  {
    tiltDeg: number;
    leftLift: number;
    rightLift: number;
    tag: string;
    leftWins: boolean;
    rightWins: boolean;
    accent: "muted" | "crema" | "ink";
  }
> = {
  default: {
    tiltDeg: 0,
    leftLift: 0,
    rightLift: 0,
    tag: "50 / 50 · Stuck",
    leftWins: false,
    rightWins: false,
    accent: "muted",
  },
  claire: {
    tiltDeg: -14,
    leftLift: 22,
    rightLift: -22,
    tag: "@claire puts Speed first",
    leftWins: true,
    rightWins: false,
    accent: "crema",
  },
  david: {
    tiltDeg: 14,
    leftLift: -22,
    rightLift: 22,
    tag: "@david puts Trust first",
    leftWins: false,
    rightWins: true,
    accent: "ink",
  },
};

export function BalanceScaleScene() {
  const [preset, setPreset] = useState<ScalePreset>("claire");
  const cfg = SCALE_CONFIG[preset];

  return (
    <div className="cc-scale-scene" data-accent={cfg.accent}>
      <svg
        viewBox="0 0 460 230"
        className="cc-brass-scale-svg"
        role="img"
        aria-label={`Priority balance scale: ${cfg.tag}`}
      >
        {/* Espresso pedestal & central column */}
        <line
          x1="156"
          y1="184"
          x2="304"
          y2="184"
          stroke="var(--cc-dark-band-line)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="230"
          y1="58"
          x2="230"
          y2="184"
          stroke="var(--cc-dark-band-line)"
          strokeWidth="2.5"
        />
        <polygon
          points="230,44 221,62 239,62"
          fill="var(--cc-crema)"
        />

        {/* Rotating Brass Beam */}
        <g
          className="cc-scale-beam-group"
          style={{
            transform: `rotate(${cfg.tiltDeg}deg)`,
            transformOrigin: "230px 58px",
          }}
        >
          <line
            x1="84"
            y1="58"
            x2="376"
            y2="58"
            stroke="var(--cc-crema)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="84" cy="58" r="4" fill="var(--cc-crema)" />
          <circle cx="376" cy="58" r="4" fill="var(--cc-crema)" />
          <circle cx="230" cy="58" r="6" fill="var(--cc-dark-band-bg)" stroke="var(--cc-crema)" strokeWidth="2.5" />
        </g>

        {/* Left Pan (Speed & Feedback) — smoothly drops/lifts staying level */}
        <g
          className="cc-scale-pan"
          style={{ transform: `translateY(${cfg.leftLift}px)` }}
        >
          <line
            x1="86"
            y1="62"
            x2="58"
            y2="132"
            stroke="var(--cc-dark-band-muted)"
            strokeWidth="1.2"
          />
          <line
            x1="86"
            y1="62"
            x2="114"
            y2="132"
            stroke="var(--cc-dark-band-muted)"
            strokeWidth="1.2"
          />
          {/* Weighted coffee orb on pan */}
          <circle
            cx="86"
            cy="116"
            r={cfg.leftWins ? 22 : 16}
            className="cc-pan-orb"
            fill={cfg.leftWins ? "var(--cc-crema)" : "var(--cc-dark-band-line)"}
          />
          <path
            d="M 46 132 Q 86 146 126 132"
            fill="none"
            stroke={cfg.leftWins ? "var(--cc-crema)" : "var(--cc-dark-band-muted)"}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text
            x="86"
            y="164"
            textAnchor="middle"
            className="cc-scale-svg-label"
            data-wins={cfg.leftWins}
          >
            Speed
          </text>
        </g>

        {/* Right Pan (Craft & Trust) — smoothly drops/lifts staying level */}
        <g
          className="cc-scale-pan"
          style={{ transform: `translateY(${cfg.rightLift}px)` }}
        >
          <line
            x1="374"
            y1="62"
            x2="346"
            y2="132"
            stroke="var(--cc-dark-band-muted)"
            strokeWidth="1.2"
          />
          <line
            x1="374"
            y1="62"
            x2="402"
            y2="132"
            stroke="var(--cc-dark-band-muted)"
            strokeWidth="1.2"
          />
          <circle
            cx="374"
            cy="116"
            r={cfg.rightWins ? 22 : 16}
            className="cc-pan-orb"
            fill={
              cfg.rightWins
                ? "var(--boa-color-slate-300)"
                : "var(--cc-dark-band-line)"
            }
          />
          <path
            d="M 334 132 Q 374 146 414 132"
            fill="none"
            stroke={
              cfg.rightWins
                ? "var(--boa-color-slate-300)"
                : "var(--cc-dark-band-muted)"
            }
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text
            x="374"
            y="164"
            textAnchor="middle"
            className="cc-scale-svg-label"
            data-wins={cfg.rightWins}
          >
            Trust
          </text>
        </g>

        {/* Center state readout cleanly below pedestal */}
        <text
          x="230"
          y="214"
          textAnchor="middle"
          className="cc-scale-svg-status"
        >
          {cfg.tag}
        </text>
      </svg>

      {/* 3 Minimal Person Toggle Pills */}
      <div
        className="cc-scale-toggles"
        role="radiogroup"
        aria-label="Tilt the priority scale"
      >
        {(
          [
            ["default", "Default AI (50/50)"],
            ["claire", "@claire"],
            ["david", "@david"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={preset === id}
            className="cc-scale-toggle"
            data-active={preset === id}
            onClick={() => setPreset(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   SCENE 3 — 3-PANEL VISUAL ANIMATED STORYBOARD (80% GRAPHIC, 20% CAPTION)
   ============================================================================ */

export function StoryboardTrio() {
  const [roastSaved, setRoastSaved] = useState(false);
  const [guest, setGuest] = useState<TableGuest>("claire");

  return (
    <div className="cc-story-grid">
      {/* PANEL 01: CORRECT ONCE -> ROAST A BEAN */}
      <article className="cc-story-card">
        <span className="cc-story-num">01 · ROAST</span>

        <div className="cc-story-canvas">
          {/* Mini visual slide before/after graphic */}
          <div className="cc-mini-slide">
            <div className="cc-mini-slide-row cc-mini-slide-top">
              <span className="cc-mini-dot-ink" />
              <span>{roastSaved ? "1. Missed Q3 (-12%)" : "1. Team highlights"}</span>
            </div>
            <div
              className="cc-mini-slide-row"
              data-struck={!roastSaved}
            >
              <span className="cc-mini-dot-muted" />
              <span>{roastSaved ? "2. Recovery plan" : "4. Missed Q3 (-12%)"}</span>
            </div>
          </div>

          {/* Interactive Confirm Stamp Arrow */}
          <button
            type="button"
            className="cc-story-action-pill"
            data-confirmed={roastSaved}
            onClick={() => setRoastSaved((v) => !v)}
          >
            <BeanIcon variant={roastSaved ? "dark" : "light"} size={18} />
            <span>{roastSaved ? "Roasted privately ✓" : "Tap to Confirm & Roast"}</span>
          </button>

          {/* Resulting Bean Badge */}
          <div className="cc-mini-bean-card" data-saved={roastSaved}>
            <strong>Hard truth &gt; Soft build-up</strong>
            <span>Private · Never saves silently</span>
          </div>
        </div>

        <h3 className="cc-story-title">Correct once. Never repeat it.</h3>
      </article>

      {/* PANEL 02: COFFEE CHAT ACROSS THE TABLE */}
      <article className="cc-story-card">
        <span className="cc-story-num">02 · COFFEE CHAT</span>

        <div className="cc-story-canvas">
          {/* Overhead Interactive Café Table with 2 Steaming Cups */}
          <div
            className="cc-cafe-table-visual"
            role="radiogroup"
            aria-label="Choose someone to Coffee Chat with"
          >
            <button
              type="button"
              role="radio"
              aria-checked={guest === "claire"}
              className="cc-cup-seat"
              data-active={guest === "claire"}
              onClick={() => setGuest("claire")}
            >
              <svg viewBox="0 0 64 64" className="cc-seat-cup-svg" aria-hidden="true">
                <circle cx="32" cy="32" r="28" fill="var(--cc-cup-saucer)" stroke="var(--cc-cup-rim)" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="20" fill="var(--cc-cup-ceramic)" stroke="var(--cc-cup-rim)" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="15" fill="var(--cc-cup-light)" />
                <path d="M 20 31 A 12 12 0 0 1 40 24" fill="none" stroke="var(--cc-crema)" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="cc-seat-label">Coffee Chat with @claire</span>
            </button>

            <span className="cc-table-vs" aria-hidden="true">
              ↔
            </span>

            <button
              type="button"
              role="radio"
              aria-checked={guest === "david"}
              className="cc-cup-seat"
              data-active={guest === "david"}
              onClick={() => setGuest("david")}
            >
              <svg viewBox="0 0 64 64" className="cc-seat-cup-svg" aria-hidden="true">
                <circle cx="32" cy="32" r="28" fill="var(--cc-cup-saucer)" stroke="var(--cc-cup-rim)" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="20" fill="var(--cc-cup-ceramic)" stroke="var(--cc-cup-rim)" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="15" fill="var(--cc-cup-dark)" />
                <circle cx="32" cy="32" r="11" fill="none" stroke="var(--yg-brand-ink)" strokeWidth="2" strokeDasharray="18 8" />
              </svg>
              <span className="cc-seat-label">Coffee Chat with @david</span>
            </button>
          </div>

          {/* Live Attributed Call Bubble */}
          <div key={guest} className="cc-table-reply" data-guest={guest}>
            <strong>
              {guest === "claire"
                ? "Based on @claire’s Beans: ship an honest draft this week."
                : "Based on @david’s Beans: test on sample data first."}
            </strong>
            <span>Attributed · Never roleplayed</span>
          </div>
        </div>

        <h3 className="cc-story-title">Borrow real Taste. Not roleplay.</h3>
      </article>

      {/* PANEL 03: ONE ROASTERY -> EVERY AI YOU USE */}
      <article className="cc-story-card">
        <span className="cc-story-num">03 · PORTABLE</span>

        <div className="cc-story-canvas">
          {/* Animated Pour-Over Hub Graphic */}
          <div className="cc-hub-jar">
            <BeanIcon variant="dark" size={20} />
            <strong>Your Private Roastery</strong>
          </div>

          <svg viewBox="0 0 240 46" className="cc-fan-svg" aria-hidden="true">
            <path d="M 120 0 C 120 22, 34 18, 34 46" fill="none" stroke="var(--cc-linen-line)" strokeWidth="1.5" />
            <path d="M 120 0 L 120 46" fill="none" stroke="var(--yg-brand-ink)" strokeWidth="1.8" />
            <path d="M 120 0 C 120 22, 206 18, 206 46" fill="none" stroke="var(--cc-linen-line)" strokeWidth="1.5" />
            <circle r="3.5" fill="var(--yg-brand)">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 120 2 C 120 22, 34 18, 34 44" />
            </circle>
            <circle r="3.5" fill="var(--cc-roast)">
              <animateMotion dur="2s" begin="0.4s" repeatCount="indefinite" path="M 120 2 L 120 44" />
            </circle>
            <circle r="3.5" fill="var(--yg-brand)">
              <animateMotion dur="2s" begin="0.8s" repeatCount="indefinite" path="M 120 2 C 120 22, 206 18, 206 44" />
            </circle>
          </svg>

          <div className="cc-host-chips">
            <span>ChatGPT</span>
            <span>Claude</span>
            <span>Codex</span>
            <span>Cursor</span>
            <span>Antigravity</span>
          </div>

          <span className="cc-hub-note">Zero server AI · Connects via MCP</span>
        </div>

        <h3 className="cc-story-title">One Roastery. Every AI you use.</h3>
      </article>
    </div>
  );
}
