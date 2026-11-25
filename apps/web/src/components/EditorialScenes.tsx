"use client";

import { useState } from "react";

export type ScalePreset = "default" | "claire" | "david";
export type TableGuest = "claire" | "david";

/* ============================================================================
   ACT 02 — PRECISION BALANCE SCALE SEESAW (CALIBRATED ROASTER BEAM)
   ============================================================================ */

const SEESAW_STATES: Record<
  ScalePreset,
  {
    angle: number;
    angleLabel: string;
    leftWins: boolean;
    rightWins: boolean;
    status: string;
    outcome: string;
    accent: "muted" | "crema" | "ink";
  }
> = {
  default: {
    angle: 0,
    angleLabel: "0.0°",
    leftWins: false,
    rightWins: false,
    status: "Default Agent · Stuck at 50 / 50",
    outcome: "“On one hand, ship fast. On the other hand, polish first…”",
    accent: "muted",
  },
  claire: {
    angle: -6.5,
    angleLabel: "-6.5°",
    leftWins: true,
    rightWins: false,
    status: "@claire · Speed & real signal win",
    outcome: "“Put an honest rough draft in front of 5 real users this week.”",
    accent: "crema",
  },
  david: {
    angle: 6.5,
    angleLabel: "+6.5°",
    leftWins: false,
    rightWins: true,
    status: "@david · Craft & day-1 trust win",
    outcome: "“Protect day-1 trust; validate on sample data before launch.”",
    accent: "ink",
  },
};

const SCALE_TICKS = [-40, -32, -24, -16, -8, 0, 8, 16, 24, 32, 40];

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
            <span className="cc-seesaw-ticks">
              {SCALE_TICKS.map((t) => (
                <i
                  key={t}
                  className="cc-seesaw-tick"
                  data-major={t === 0 || Math.abs(t) === 24 || Math.abs(t) === 40}
                />
              ))}
            </span>
            <i className="cc-seesaw-dot-left" data-wins={state.leftWins} />
            <i className="cc-seesaw-pivot-pin" />
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
          <svg width="44" height="22" viewBox="0 0 44 22">
            <path
              d="M 22 2 L 34 19 L 10 19 Z"
              fill="none"
              stroke="var(--cc-crema)"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <circle cx="22" cy="12" r="2.2" fill="var(--cc-crema)" />
            <line
              x1="4"
              y1="20.5"
              x2="40"
              y2="20.5"
              stroke="var(--cc-dark-band-line)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="cc-seesaw-degree">{state.angleLabel}</span>
        </div>

        <div key={preset} className="cc-seesaw-readout-block">
          <p className="cc-seesaw-readout">{state.status}</p>
          <p className="cc-seesaw-outcome">{state.outcome}</p>
        </div>
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
            data-preset={id}
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
   ACT 03 — INTERACTIVE CAFÉ TABLE PHOTOGRAPH WITH ZERO-COLLISION SIGNAL ARC
   ============================================================================ */

export function InteractiveCafeTable() {
  const [guest, setGuest] = useState<TableGuest>("claire");

  // Clean upper-table curves: Claire arcs gracefully OVER the open stone without ever crossing David's cup
  const activeArcPath =
    guest === "claire"
      ? "M 226 214 C 344 88, 608 92, 796 184"
      : "M 698 224 C 734 188, 766 184, 796 184";

  return (
    <div className="cc-table-editorial">
      {/* Realistic Café Table Studio Photo + Zero-Collision Arc + Exact Cup Hotspots */}
      <div className="cc-table-photo-wrap" data-guest={guest}>
        <img
          src="/art/cafe-table.jpg"
          alt="Two contrasting ceramic coffee cups seated across a warm travertine and linen café table"
          className="cc-table-photo"
        />

        {/* Animated signal arc rising over open table margin straight into the verdict */}
        <svg
          viewBox="0 0 800 600"
          className="cc-table-motion-overlay"
          aria-hidden="true"
        >
          <path
            key={`arc-${guest}`}
            d={activeArcPath}
            fill="none"
            stroke={
              guest === "claire"
                ? "var(--cc-roast)"
                : "var(--yg-brand-ink)"
            }
            strokeWidth="2.2"
            strokeDasharray="5 7"
            strokeLinecap="round"
            opacity="0.78"
          />
          <circle
            key={`origin-${guest}`}
            cx={guest === "claire" ? 226 : 698}
            cy={guest === "claire" ? 214 : 224}
            r="4.5"
            fill={guest === "claire" ? "var(--cc-roast)" : "var(--yg-brand)"}
            stroke="var(--cc-crema)"
            strokeWidth="1.5"
          />
          <circle
            key={`pulse1-${guest}`}
            r="5.5"
            fill={
              guest === "claire" ? "var(--cc-roast)" : "var(--yg-brand)"
            }
            stroke="var(--cc-crema)"
            strokeWidth="2"
          >
            <animateMotion
              dur="1.9s"
              repeatCount="indefinite"
              path={activeArcPath}
            />
          </circle>
          <circle
            key={`pulse2-${guest}`}
            r="3.5"
            fill="var(--cc-crema)"
          >
            <animateMotion
              dur="1.9s"
              begin="0.95s"
              repeatCount="indefinite"
              path={activeArcPath}
            />
          </circle>
        </svg>

        {/* Container-proportional rings centered pixel-accurately over both ceramic cups */}
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
            <span className="cc-hotspot-tag">
              <i className="cc-hotspot-dot" aria-hidden="true" />
              <span>
                <span className="cc-hotspot-prefix">Coffee Chat with </span>
                @claire
              </span>
            </span>
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
            <span className="cc-hotspot-tag">
              <i className="cc-hotspot-dot" aria-hidden="true" />
              <span>
                <span className="cc-hotspot-prefix">Coffee Chat with </span>
                @david
              </span>
            </span>
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
            <i aria-hidden="true" />
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

          <button
            type="button"
            className="cc-table-swap-btn"
            onClick={() => setGuest(guest === "claire" ? "david" : "claire")}
          >
            {guest === "claire"
              ? "Compare with @david’s dark roast →"
              : "Switch back to @claire’s light roast →"}
          </button>
        </div>
      </div>
    </div>
  );
}
