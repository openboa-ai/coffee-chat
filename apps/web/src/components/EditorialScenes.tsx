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
    status: "Default Agent · Stuck at 50 / 50",
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
      <div className="cc-seesaw-stage">
        <div
          className="cc-seesaw-beam"
          style={{ transform: `rotate(${state.angle}deg)` }}
        >
          <span
            className="cc-seesaw-word cc-seesaw-left"
            data-wins={state.leftWins}
          >
            Speed &amp; Feedback
          </span>
          <span className="cc-seesaw-bar" aria-hidden="true">
            <i className="cc-seesaw-dot-left" data-wins={state.leftWins} />
            <i className="cc-seesaw-dot-right" data-wins={state.rightWins} />
          </span>
          <span
            className="cc-seesaw-word cc-seesaw-right"
            data-wins={state.rightWins}
          >
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

      <div
        className="cc-scale-toggles"
        role="radiogroup"
        aria-label="Tilt the priority seesaw"
      >
        {(
          [
            ["default", "Default Agent (50/50)"],
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
   ACT 03 — INTERACTIVE CAFÉ TABLE PHOTOGRAPH WITH ANIMATED SIGNAL ARC
   ============================================================================ */

export function InteractiveCafeTable() {
  const [guest, setGuest] = useState<TableGuest>("claire");

  return (
    <div className="cc-table-editorial">
      {/* Realistic Café Table Studio Photo + Animated Connection Arc + Direct Cup Tap */}
      <div className="cc-table-photo-wrap" data-guest={guest}>
        <img
          src="/art/cafe-table.jpg"
          alt="Two contrasting ceramic coffee cups seated across a warm travertine and linen café table"
          className="cc-table-photo"
        />

        {/* Delicate animated signal arc flowing across the realistic table from the active cup */}
        <svg
          viewBox="0 0 800 600"
          className="cc-table-motion-overlay"
          aria-hidden="true"
        >
          {/* Animated aroma pulse radiating cleanly from active cup toward the right verdict */}
          <path
            key={`arc-${guest}`}
            d={
              guest === "claire"
                ? "M 164 300 C 340 165, 580 185, 792 275"
                : "M 642 300 C 700 250, 748 255, 792 275"
            }
            fill="none"
            stroke={
              guest === "claire"
                ? "var(--cc-roast)"
                : "var(--yg-brand-ink)"
            }
            strokeWidth="2.5"
            strokeDasharray="6 8"
            opacity="0.72"
          />
          <circle
            key={`pulse1-${guest}`}
            r="6"
            fill={
              guest === "claire" ? "var(--cc-roast)" : "var(--yg-brand)"
            }
            stroke="var(--cc-crema)"
            strokeWidth="2"
          >
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              path={
                guest === "claire"
                  ? "M 164 300 C 340 165, 580 185, 792 275"
                  : "M 642 300 C 700 250, 748 255, 792 275"
              }
            />
          </circle>
          <circle
            key={`pulse2-${guest}`}
            r="4"
            fill="var(--cc-crema)"
          >
            <animateMotion
              dur="1.8s"
              begin="0.9s"
              repeatCount="indefinite"
              path={
                guest === "claire"
                  ? "M 164 300 C 340 165, 580 185, 792 275"
                  : "M 642 300 C 700 250, 748 255, 792 275"
              }
            />
          </circle>
        </svg>

        {/* Direct interactive focus hotspots dead-center over the two real cups */}
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
            <span className="cc-hotspot-pulse" aria-hidden="true" />
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
            <span className="cc-hotspot-pulse" aria-hidden="true" />
            <span className="cc-hotspot-tag">Coffee Chat with @david</span>
          </button>
        </div>
      </div>

      {/* Right — Open Editorial Verdict Floating Freely */}
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
