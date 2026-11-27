"use client";

import type {
  StageChatPartner,
  StageRoastMode,
} from "@/lib/coffee-scene/cinemaEngine";

export interface CoffeeStoryHudProps {
  activeAct: number;
  roastMode: StageRoastMode;
  roastConfirmed: boolean;
  roastPriorityShort: string;
  roastBoundaryShort: string;
  brewActive: boolean;
  boundaryTriggered: boolean;
  chatPartner: StageChatPartner;
}

export function CoffeeStoryHud({
  activeAct,
  roastMode,
  roastConfirmed,
  roastPriorityShort,
  roastBoundaryShort,
  brewActive,
  boundaryTriggered,
  chatPartner,
}: CoffeeStoryHudProps) {
  // Compute exact Act 04 lateral dolly offset matching cinemaEngine tableShiftX (±0.024 -> ±35px)
  const act4ShiftX =
    chatPartner === "claire" ? 34 : chatPartner === "david" ? -34 : 0;
  const act4Scale = chatPartner === "both" ? 1 : 1.03;

  return (
    <div
      className="cc-story-hud"
      aria-hidden="true"
      data-act={activeAct}
    >
      <div className="cc-story-hud-rig">
        {/* ================================================================
            CUT 01 (75deg HERO): TASTE LOCK COMPASS OVER THE ESPRESSO CUP
            ================================================================ */}
        <svg
          className="cc-hud-svg"
          data-visible={activeAct === 0 ? "true" : "false"}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Precision outer optical compass concentric with the matte ink saucer */}
          <g className="cc-hud-spin-slow" style={{ transformOrigin: "1096px 444px" }}>
            <circle
              cx="1096"
              cy="444"
              r="298"
              fill="none"
              className="cc-svg-hairline"
              strokeDasharray="4 10"
            />
          </g>

          {/* Inner lock ring concentric with the espresso cup lip */}
          <circle
            cx="1096"
            cy="444"
            r="164"
            fill="none"
            className={
              roastMode === "decaf" ? "cc-svg-ring-muted" : "cc-svg-ring-accent"
            }
            strokeDasharray={roastMode === "decaf" ? "10 10" : "1030"}
          />

          {/* Top Taste Balance Bar centered cleanly above the cup */}
          <g transform="translate(866, 102)">
            <line
              x1="0"
              y1="26"
              x2="460"
              y2="26"
              className="cc-svg-hairline-strong"
            />
            <line x1="230" y1="18" x2="230" y2="34" className="cc-svg-hairline" />
            <text x="0" y="12" className="cc-svg-mono">
              FAST LEARNER
            </text>
            <text x="460" y="12" textAnchor="end" className="cc-svg-mono">
              PROVEN SPECIALIST
            </text>

            {/* Animated priority indicator needle */}
            <g
              className={
                roastMode === "decaf"
                  ? "cc-needle-oscillate"
                  : roastMode === "growth"
                    ? "cc-needle-lock-left"
                    : "cc-needle-lock-right"
              }
            >
              <circle
                cx="230"
                cy="26"
                r="7"
                className={
                  roastMode === "decaf" ? "cc-svg-dot-muted" : "cc-svg-dot-accent"
                }
              />
              <circle
                cx="230"
                cy="26"
                r="14"
                fill="none"
                className={
                  roastMode === "decaf" ? "cc-svg-ring-muted" : "cc-svg-ring-accent"
                }
              />
            </g>

            {/* Status telemetry readout */}
            <text
              x="230"
              y="54"
              textAnchor="middle"
              className={
                roastMode === "decaf" ? "cc-svg-mono" : "cc-svg-mono-accent"
              }
            >
              {roastMode === "decaf"
                ? "NO BEAN · 50 / 50 OSCILLATING HEDGE"
                : roastMode === "growth"
                  ? "TASTE LOCKED · 94% GROWTH PRIORITY"
                  : "TASTE LOCKED · 96% SPECIALIST PRIORITY"}
            </text>
          </g>

          {/* Subtle optical lens slate tag */}
          <text x="1368" y="796" textAnchor="end" className="cc-svg-slate">
            75° HERO · 50MM · F/2.8
          </text>
        </svg>

        {/* ================================================================
            CUT 02 (5deg MACRO DIVE): CONVERSATION -> SINGLE BEAN DISTILLATION
            ================================================================ */}
        <svg
          className="cc-hud-svg"
          data-visible={activeAct === 1 ? "true" : "false"}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Incoming messy conversation filaments converging straight onto the single roasted bean */}
          <g
            className="cc-distill-filaments"
            data-confirmed={roastConfirmed ? "true" : "false"}
          >
            <path
              d="M 730 220 C 835 220, 910 390, 982 504"
              fill="none"
              className="cc-svg-flow-muted"
            />
            <path
              d="M 710 302 C 820 315, 900 432, 972 522"
              fill="none"
              className="cc-svg-flow-muted"
            />
            <path
              d="M 726 388 C 824 410, 892 480, 964 540"
              fill="none"
              className="cc-svg-flow-muted"
            />
            <text x="724" y="210" className="cc-svg-noise">
              “polish onboarding copy…”
            </text>
            <text x="704" y="292" className="cc-svg-noise">
              “add 3 extra settings…”
            </text>
            <text x="720" y="378" className="cc-svg-noise">
              “wait 2 more weeks…”
            </text>
          </g>

          {/* Macro target brackets & 360-degree animated Confirmation Seal around the hero bean (1008, 550) */}
          <g transform="translate(1008, 550)">
            {/* Outer subtle focus reticle */}
            <circle
              cx="0"
              cy="0"
              r="112"
              fill="none"
              className="cc-svg-hairline"
              strokeDasharray="3 8"
            />
            {/* Animated confirmation seal ring (draws 0->360 on Confirm & Roast!) */}
            <circle
              cx="0"
              cy="0"
              r="96"
              fill="none"
              className="cc-svg-seal-ring"
              data-confirmed={roastConfirmed ? "true" : "false"}
              transform="rotate(-90)"
            />

            {/* Optical corner focus ticks */}
            <path
              d="M -118 -74 L -118 -118 L -74 -118 M 74 -118 L 118 -118 L 118 -74 M 118 74 L 118 118 L 74 118 M -74 118 L -118 118 L -118 74"
              fill="none"
              className={
                roastConfirmed ? "cc-svg-ring-accent" : "cc-svg-hairline-strong"
              }
            />

            {/* Structured Priority & Boundary callout beams anchored off the bean */}
            <g
              className="cc-bean-callouts"
              data-confirmed={roastConfirmed ? "true" : "false"}
            >
              {/* Priority Beam (upper-right) */}
              <polyline
                points="82,-54 134,-104 358,-104"
                fill="none"
                className="cc-svg-ring-accent"
              />
              <circle cx="82" cy="-54" r="4" className="cc-svg-dot-accent" />
              <text x="142" y="-114" className="cc-svg-mono-accent">
                PRIORITY · TRADE-OFF
              </text>
              <text x="142" y="-82" className="cc-svg-label">
                {roastPriorityShort}
              </text>

              {/* Boundary Beam (lower-left/bottom) */}
              <polyline
                points="-66,74 -118,128 -320,128"
                fill="none"
                className="cc-svg-ring-alert"
              />
              <circle cx="-66" cy="74" r="4" className="cc-svg-dot-alert" />
              <text x="-320" y="118" className="cc-svg-mono-alert">
                BOUNDARY · EXCEPT WHEN
              </text>
              <text x="-320" y="150" className="cc-svg-label">
                {roastBoundaryShort}
              </text>
            </g>

            {/* Vault confirmation stamp directly below bean */}
            <text
              x="0"
              y="148"
              textAnchor="middle"
              className={roastConfirmed ? "cc-svg-mono-accent" : "cc-svg-mono"}
            >
              {roastConfirmed
                ? "✓ ROASTED · PRIVATE BEAN SEALED"
                : "DRAFT · UNCONFIRMED UNTIL YOU APPROVE"}
            </text>
          </g>

          <text x="1364" y="796" textAnchor="end" className="cc-svg-slate">
            5° MACRO DIVE · 100MM · F/1.8
          </text>
        </svg>

        {/* ================================================================
            CUT 03 (45deg POUR TRACK): POUR STREAM CONDUIT + BOUNDARY SHIELD
            ================================================================ */}
        <svg
          className="cc-hud-svg"
          data-visible={activeAct === 2 ? "true" : "false"}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Top source node anchored directly at the matte ink gooseneck spout */}
          <g transform="translate(1112, 178)">
            <circle
              cx="0"
              cy="28"
              r="5"
              className={brewActive ? "cc-svg-dot-accent" : "cc-svg-dot-muted"}
            />
            <text x="-16" y="18" textAnchor="end" className="cc-svg-mono-accent">
              CONFIRMED BEAN · MCP
            </text>
            <text x="-16" y="38" textAnchor="end" className="cc-svg-mono">
              {brewActive ? "STREAMING TASTE" : "PAUSED · TASTE OFF"}
            </text>
          </g>

          {/* Live Taste Conduit riding DEAD CENTER inside the photographed amber coffee pour stream! */}
          <path
            d="M 1110 214 Q 1084 290 1062 368"
            fill="none"
            className={
              brewActive ? "cc-svg-pour-flow" : "cc-svg-pour-paused"
            }
          />
          <path
            d="M 1062 368 Q 1048 432 1040 502"
            fill="none"
            className={
              !brewActive
                ? "cc-svg-pour-paused"
                : boundaryTriggered
                  ? "cc-svg-pour-blocked"
                  : "cc-svg-pour-flow"
            }
          />

          {/* PHYSICAL BOUNDARY SHIELD GATE — Slams horizontally right across the pour stream! */}
          <g
            className="cc-boundary-gate"
            data-triggered={boundaryTriggered ? "true" : "false"}
          >
            <line
              x1="854"
              y1="368"
              x2="1264"
              y2="368"
              className="cc-svg-gate-bar"
            />
            <circle cx="1062" cy="368" r="18" fill="none" className="cc-svg-gate-pulse" />
            <circle cx="1062" cy="368" r="6" className="cc-svg-dot-alert" />
            <text x="854" y="354" className="cc-svg-mono-alert">
              ✕ BOUNDARY GATE · PUBLIC BILLING
            </text>
            <text x="1264" y="354" textAnchor="end" className="cc-svg-mono-alert">
              TASTE HELD BACK
            </text>
          </g>

          {/* 3 Agent Endpoint Pips fanned out below the cup showing synchronized MCP distribution */}
          <g transform="translate(1018, 520)">
            {/* Connecting distribution hairlines */}
            <path
              d="M 0 18 C -75 78, -165 112, -210 142"
              fill="none"
              className={
                brewActive && !boundaryTriggered
                  ? "cc-svg-ring-accent"
                  : "cc-svg-hairline"
              }
              strokeDasharray="4 6"
            />
            <path
              d="M 0 18 L 0 164"
              fill="none"
              className={
                brewActive && !boundaryTriggered
                  ? "cc-svg-ring-accent"
                  : "cc-svg-hairline"
              }
              strokeDasharray="4 6"
            />
            <path
              d="M 0 18 C 75 78, 165 112, 210 142"
              fill="none"
              className={
                brewActive && !boundaryTriggered
                  ? "cc-svg-ring-accent"
                  : "cc-svg-hairline"
              }
              strokeDasharray="4 6"
            />

            {/* Coding Agent */}
            <g transform="translate(-210, 158)">
              <circle
                cx="0"
                cy="-14"
                r="5"
                className={
                  boundaryTriggered
                    ? "cc-svg-dot-alert"
                    : brewActive
                      ? "cc-svg-dot-accent"
                      : "cc-svg-dot-muted"
                }
              />
              <text x="0" y="6" textAnchor="middle" className="cc-svg-label-sm">
                Coding Agent
              </text>
              <text
                x="0"
                y="24"
                textAnchor="middle"
                className={
                  boundaryTriggered
                    ? "cc-svg-mono-alert"
                    : brewActive
                      ? "cc-svg-mono-accent"
                      : "cc-svg-mono"
                }
              >
                {boundaryTriggered
                  ? "HELD BACK"
                  : brewActive
                    ? "BREWED ✓"
                    : "DEFAULT"}
              </text>
            </g>

            {/* Writing Agent */}
            <g transform="translate(0, 180)">
              <circle
                cx="0"
                cy="-14"
                r="5"
                className={
                  boundaryTriggered
                    ? "cc-svg-dot-alert"
                    : brewActive
                      ? "cc-svg-dot-accent"
                      : "cc-svg-dot-muted"
                }
              />
              <text x="0" y="6" textAnchor="middle" className="cc-svg-label-sm">
                Writing Agent
              </text>
              <text
                x="0"
                y="24"
                textAnchor="middle"
                className={
                  boundaryTriggered
                    ? "cc-svg-mono-alert"
                    : brewActive
                      ? "cc-svg-mono-accent"
                      : "cc-svg-mono"
                }
              >
                {boundaryTriggered
                  ? "HELD BACK"
                  : brewActive
                    ? "BREWED ✓"
                    : "DEFAULT"}
              </text>
            </g>

            {/* Planning Agent */}
            <g transform="translate(210, 158)">
              <circle
                cx="0"
                cy="-14"
                r="5"
                className={
                  boundaryTriggered
                    ? "cc-svg-dot-alert"
                    : brewActive
                      ? "cc-svg-dot-accent"
                      : "cc-svg-dot-muted"
                }
              />
              <text x="0" y="6" textAnchor="middle" className="cc-svg-label-sm">
                Planning Agent
              </text>
              <text
                x="0"
                y="24"
                textAnchor="middle"
                className={
                  boundaryTriggered
                    ? "cc-svg-mono-alert"
                    : brewActive
                      ? "cc-svg-mono-accent"
                      : "cc-svg-mono"
                }
              >
                {boundaryTriggered
                  ? "HELD BACK"
                  : brewActive
                    ? "BREWED ✓"
                    : "DEFAULT"}
              </text>
            </g>
          </g>

          <text x="1364" y="796" textAnchor="end" className="cc-svg-slate">
            {boundaryTriggered
              ? "SHUTTER FREEZE · 1/4000S · BOUNDARY LOCK"
              : "45° POUR TRACK · 85MM · F/2.0"}
          </text>
        </svg>

        {/* ================================================================
            CUT 04 (90deg OVERHEAD CRANE): TWO-CUP COMPARISON BRIDGE
            ================================================================ */}
        <svg
          className="cc-hud-svg"
          data-visible={activeAct === 3 ? "true" : "false"}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <g
            className="cc-two-cup-rig"
            style={{
              transform: `translate(${act4ShiftX}px, 0px) scale(${act4Scale})`,
              transformOrigin: "964px 448px",
            }}
          >
            {/* @claire Ivory Cup Reticle (exact cup center 782, 448) */}
            <g
              className="cc-cup-node"
              data-active={
                chatPartner === "claire" || chatPartner === "both"
                  ? "true"
                  : "false"
              }
            >
              <circle
                cx="782"
                cy="448"
                r="142"
                fill="none"
                className={
                  chatPartner === "claire" || chatPartner === "both"
                    ? "cc-svg-ring-warm"
                    : "cc-svg-hairline"
                }
                strokeDasharray={chatPartner === "david" ? "5 9" : "none"}
              />
              <text
                x="782"
                y="274"
                textAnchor="middle"
                className="cc-svg-mono-warm"
              >
                IVORY CUP · @CLAIRE
              </text>
              <text x="782" y="294" textAnchor="middle" className="cc-svg-label-sm">
                Speed &amp; signal &gt; polish
              </text>
            </g>

            {/* @david Matte Ink Cup Reticle (exact cup center 1146, 448) */}
            <g
              className="cc-cup-node"
              data-active={
                chatPartner === "david" || chatPartner === "both"
                  ? "true"
                  : "false"
              }
            >
              <circle
                cx="1146"
                cy="448"
                r="120"
                fill="none"
                className={
                  chatPartner === "david" || chatPartner === "both"
                    ? "cc-svg-ring-accent"
                    : "cc-svg-hairline"
                }
                strokeDasharray={chatPartner === "claire" ? "5 9" : "none"}
              />
              <text
                x="1146"
                y="296"
                textAnchor="middle"
                className="cc-svg-mono-accent"
              >
                SLATE CUP · @DAVID
              </text>
              <text x="1146" y="316" textAnchor="middle" className="cc-svg-label-sm">
                Day-1 trust &gt; speed
              </text>
            </g>

            {/* Live Comparison Arc Bridge connecting the two cups cleanly across the bare stone gap */}
            <path
              d="M 906 382 Q 964 334 1034 386"
              fill="none"
              className={
                chatPartner === "both"
                  ? "cc-svg-bridge-active"
                  : "cc-svg-hairline-strong"
              }
            />
            <path
              d="M 1034 510 Q 964 558 906 512"
              fill="none"
              className={
                chatPartner === "both"
                  ? "cc-svg-bridge-active"
                  : "cc-svg-hairline-strong"
              }
            />

            {/* Shared Link Center Anchor */}
            <circle cx="964" cy="448" r="5" className="cc-svg-dot-accent" />
            <text x="964" y="618" textAnchor="middle" className="cc-svg-mono-accent">
              {chatPartner === "both"
                ? "DIVERGENCE · DRAFT FAST ↔ VERIFY TRUST FIRST"
                : "SAME SOURCE LINK · ZERO IMPERSONATION"}
            </text>
          </g>

          <text x="1368" y="796" textAnchor="end" className="cc-svg-slate">
            {chatPartner === "claire"
              ? "90° CRANE · DOLLY LEFT · @CLAIRE"
              : chatPartner === "david"
                ? "90° CRANE · DOLLY RIGHT · @DAVID"
                : "90° OVERHEAD CRANE · 35MM · WIDE TABLE"}
          </text>
        </svg>

        {/* ================================================================
            CUT 05 (PULL-BACK HORIZON): CALM CLOSING FRAME
            ================================================================ */}
        <svg
          className="cc-hud-svg"
          data-visible={activeAct === 4 ? "true" : "false"}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <circle
            cx="1096"
            cy="444"
            r="300"
            fill="none"
            className="cc-svg-hairline"
            strokeDasharray="2 12"
          />
          <text x="1368" y="746" textAnchor="end" className="cc-svg-slate">
            CRANE PULL-BACK · READY TO BREW
          </text>
        </svg>
      </div>
    </div>
  );
}
