"use client";

import { useState } from "react";

export type ScalePreset = "default" | "claire" | "david";
export type TableGuest = "claire" | "david";

/* ============================================================================
   ACT 02 — FULL-WIDTH KINETIC TYPOGRAPHIC SEESAW (ZERO CLIP-ART BOXES)
   ============================================================================ */

const SEESAW_STATES: Record<
  ScalePreset,
  {
    angle: number;
    leftWins: boolean;
    rightWins: boolean;
    status: string;
    accent: "muted" | "crema" | "ink";
  }
> = {
  default: {
    angle: 0,
    leftWins: false,
    rightWins: false,
    status: "Default AI · Stuck at 50 / 50",
    accent: "muted",
  },
  claire: {
    angle: -6.5,
    leftWins: true,
    rightWins: false,
    status: "@claire · Speed & real signal win",
    accent: "crema",
  },
  david: {
    angle: 6.5,
    leftWins: false,
    rightWins: true,
    status: "@david · Craft & day-1 trust win",
    accent: "ink",
  },
};

export function KineticTypoSeesaw() {
  const [preset, setPreset] = useState<ScalePreset>("claire");
  const state = SEESAW_STATES[preset];

  return (
    <div className="cc-typo-seesaw" data-accent={state.accent}>
      {/* Monumental pivoting typographic beam spanning freely across the espresso canvas */}
      <div className="cc-seesaw-stage">
        <div
          className="cc-seesaw-beam"
          style={{ transform: `rotate(${state.angle}deg)` }}
        >
          <span className="cc-seesaw-word cc-seesaw-left" data-wins={state.leftWins}>
            Speed &amp; Feedback
          </span>
          <span className="cc-seesaw-bar" aria-hidden="true">
            <i className="cc-seesaw-dot-left" data-wins={state.leftWins} />
            <i className="cc-seesaw-dot-right" data-wins={state.rightWins} />
          </span>
          <span className="cc-seesaw-word cc-seesaw-right" data-wins={state.rightWins}>
            Craft &amp; Trust
          </span>
        </div>

        <div className="cc-seesaw-fulcrum" aria-hidden="true">
          <svg width="26" height="16" viewBox="0 0 26 16">
            <polygon points="13,1 25,15 1,15" fill="var(--cc-crema)" />
          </svg>
        </div>

        <p className="cc-seesaw-readout">{state.status}</p>
      </div>

      {/* Minimal bare-pill selector floating cleanly underneath */}
      <div
        className="cc-scale-toggles"
        role="radiogroup"
        aria-label="Tilt the priority seesaw"
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
   ACT 03 — INTERACTIVE CAFÉ TABLE GALLERY (CLICK DIRECTLY ON EITHER CUP!)
   ============================================================================ */

export function InteractiveCafeTable() {
  const [guest, setGuest] = useState<TableGuest>("claire");

  return (
    <div className="cc-table-editorial">
      {/* Left / Wide Editorial Studio Photograph with Direct Clickable Cup Hotspots */}
      <div className="cc-table-photo-wrap" data-guest={guest}>
        <img
          src="/art/cafe-table.jpg"
          alt="Two contrasting ceramic coffee cups seated across a warm travertine and linen café table"
          className="cc-table-photo"
        />

        {/* Subtle interactive focus hotspots aligned right over the two real ceramic cups */}
        <div
          className="cc-table-hotspots"
          role="radiogroup"
          aria-label="Click a cup to Coffee Chat with that person's Taste"
        >
          <button
            type="button"
            role="radio"
            aria-checked={guest === "claire"}
            className="cc-cup-hotspot cc-cup-hotspot-left"
            data-active={guest === "claire"}
            onClick={() => setGuest("claire")}
          >
            <span className="cc-hotspot-ring" aria-hidden="true" />
            <span className="cc-hotspot-tag">Coffee Chat with @claire</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={guest === "david"}
            className="cc-cup-hotspot cc-cup-hotspot-right"
            data-active={guest === "david"}
            onClick={() => setGuest("david")}
          >
            <span className="cc-hotspot-ring" aria-hidden="true" />
            <span className="cc-hotspot-tag">Coffee Chat with @david</span>
          </button>
        </div>
      </div>

      {/* Right — Open Editorial Verdict Floating Freely (Zero Boxes!) */}
      <div className="cc-table-editorial-copy">
        <span className="cc-kicker-warm">Coffee Chat · Tap either cup</span>
        <h2 className="cc-editorial-h2">
          Sit down with someone’s real priorities.
        </h2>

        <p className="cc-table-prompt">
          “Polish another month, or show 10 customers a rough draft this week?”
        </p>

        <div key={guest} className="cc-table-verdict-open" data-guest={guest}>
          <span className="cc-table-roast-pill">
            {guest === "claire"
              ? "Ivory Cup · @claire (Light Roast · Speed)"
              : "Ink Blue Cup · @david (Dark Roast · Trust)"}
          </span>

          <p className="cc-table-verdict-quote">
            {guest === "claire"
              ? "Based on @claire’s Beans, show an honest draft this week."
              : "Based on @david’s Beans, test only on sample data first."}
          </p>

          <span className="cc-verdict-boundary">
            {guest === "claire"
              ? "Attributed to @claire · Flips if launch is irreversible · Never roleplayed"
              : "Attributed to @david · Flips on sample-data prototypes · Never roleplayed"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ACT 04 — OPEN FREE-FORM EDITORIAL DUO (ROAST IN ONE EDIT + EVERY AI POUR)
   ============================================================================ */

export function OpenRoastAndPour() {
  const [roastSaved, setRoastSaved] = useState(false);

  return (
    <div className="cc-free-duo">
      {/* LEFT OPEN SPACE: FREE-FLOATING TYPOGRAPHIC EDIT -> ROAST */}
      <div className="cc-free-col">
        <span className="cc-kicker-warm">Roast once</span>
        <h2 className="cc-editorial-h2">Correct once. Never repeat it.</h2>

        <div className="cc-typo-edit">
          <span className="cc-edit-old" data-saved={roastSaved}>
            Slide 4 · Missed Q3 target (-12%)
          </span>

          <svg
            viewBox="0 0 120 34"
            className="cc-edit-curve"
            aria-hidden="true"
          >
            <path
              d="M 10 4 C 12 24, 52 24, 96 20"
              fill="none"
              stroke={roastSaved ? "var(--yg-brand-ink)" : "var(--cc-roast)"}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 90 14 L 99 20 L 91 26"
              fill="none"
              stroke={roastSaved ? "var(--yg-brand-ink)" : "var(--cc-roast)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <p className="cc-edit-new" data-saved={roastSaved}>
            Sentence 1 · Lead with the hard truth.
          </p>
        </div>

        <div className="cc-edit-actions">
          <button
            type="button"
            className="cc-roast-stamp-btn"
            data-confirmed={roastSaved}
            onClick={() => setRoastSaved((v) => !v)}
          >
            <i aria-hidden="true" />
            <span>
              {roastSaved
                ? "Roasted privately ✓ · Hard truth > Soft build-up"
                : "Tap to Confirm & Roast privately"}
            </span>
          </button>
          <span className="cc-quiet-meta">Never saves without your tap.</span>
        </div>
      </div>

      {/* RIGHT OPEN SPACE: FLOWING OPEN POUR STREAM TO EVERY AI */}
      <div className="cc-free-col cc-free-col-right">
        <span className="cc-kicker-ink">Portable Taste</span>
        <h2 className="cc-editorial-h2">One Roastery. Every AI.</h2>

        <div className="cc-pour-ribbon">
          <span className="cc-ribbon-source">Your Private Roastery</span>

          <svg
            viewBox="0 0 380 42"
            className="cc-ribbon-svg"
            aria-hidden="true"
          >
            <path
              d="M 4 21 C 90 21, 120 6, 190 21 C 260 36, 290 21, 376 21"
              fill="none"
              stroke="var(--cc-linen-line)"
              strokeWidth="2"
            />
            <path
              d="M 4 21 C 90 21, 120 6, 190 21 C 260 36, 290 21, 376 21"
              fill="none"
              stroke="var(--yg-brand-ink)"
              strokeWidth="2"
              strokeDasharray="8 10"
              opacity="0.65"
            />
            <circle r="5" fill="var(--yg-brand)">
              <animateMotion
                dur="2.4s"
                repeatCount="indefinite"
                path="M 4 21 C 90 21, 120 6, 190 21 C 260 36, 290 21, 376 21"
              />
            </circle>
            <circle r="4" fill="var(--cc-roast)">
              <animateMotion
                dur="2.4s"
                begin="1.2s"
                repeatCount="indefinite"
                path="M 4 21 C 90 21, 120 6, 190 21 C 260 36, 290 21, 376 21"
              />
            </circle>
          </svg>

          <div className="cc-ribbon-hosts">
            <span>ChatGPT</span>
            <span>Claude</span>
            <span>Codex</span>
            <span>Cursor</span>
            <span>Antigravity</span>
          </div>
        </div>

        <span className="cc-verdict-boundary">
          Private by default · Zero server AI · Connects via MCP
        </span>
      </div>
    </div>
  );
}
