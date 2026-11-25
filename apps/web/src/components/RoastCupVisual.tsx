"use client";

export type RoastBrewMode = "decaf" | "growth" | "craft";

export interface RoastCupVisualProps {
  /** 8..92 continuous slider value (50 = decaf neutral) */
  bias: number;
  mode: RoastBrewMode;
}

/**
 * Overhead minimalist porcelain café cup & espresso extraction graphic built
 * directly from Yogurt's official coffee icon tokens (earth, ochre, neutral)
 * harmonized with OpenBoa Ink Blue (--yg-brand-ink).
 *
 * - Default AI (decaf): pale flat liquid, no crema swirl, no steam.
 * - Growth Roast (left): warm medium amber brew, luminous crema swirl, gentle steam.
 * - Specialist Roast (right): deep dark roast espresso, dense golden crema ring, rich steam.
 */
export function RoastCupVisual({ bias, mode }: RoastCupVisualProps) {
  const isDecaf = mode === "decaf";
  const isCraft = mode === "craft";

  // Map bias 8..92 onto a graceful upper-saucer dial arc (-68deg .. +68deg from top)
  const norm = (bias - 50) / 42;
  const angleDeg = Math.max(-68, Math.min(68, norm * 68));
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  const dialR = 112;
  const markerX = 140 + Math.cos(angleRad) * dialR;
  const markerY = 140 + Math.sin(angleRad) * dialR;

  // Slight organic rotation of the crema swirl tied smoothly to the slider
  const cremaRotate = Math.round((bias - 50) * 1.4);

  return (
    <div className="cc-cup-stage" data-mode={mode} aria-hidden="true">
      <svg
        viewBox="0 0 280 280"
        className="cc-cup-svg"
        role="presentation"
      >
        {/* Subtle saucer dial arc spanning Light Roast <-> Decaf <-> Dark Roast */}
        <path
          d="M 36.1 98.1 A 112 112 0 0 1 243.9 98.1"
          fill="none"
          stroke="var(--cc-linen-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Center 50/50 tick at 12 o'clock */}
        <line
          x1="140"
          y1="22"
          x2="140"
          y2="34"
          stroke="var(--cc-roast-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Live OpenBoa Ink Blue extraction marker gliding along the saucer dial */}
        <circle
          cx={markerX}
          cy={markerY}
          r={isDecaf ? 5 : 6.5}
          className="cc-cup-dial-dot"
        />

        {/* Porcelain Saucer */}
        <circle
          cx="140"
          cy="146"
          r="94"
          fill="var(--cc-cup-saucer)"
          stroke="var(--cc-cup-rim)"
          strokeWidth="1.25"
        />
        <circle
          cx="140"
          cy="146"
          r="70"
          fill="none"
          stroke="var(--cc-cup-rim)"
          strokeWidth="1"
          opacity="0.7"
        />

        {/* Porcelain Cup Handle — smooth outer rim outline + inner ceramic fill */}
        <path
          d="M 200 134 C 228 134, 232 158, 200 158"
          fill="none"
          stroke="var(--cc-cup-rim)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 200 134 C 228 134, 232 158, 200 158"
          fill="none"
          stroke="var(--cc-cup-ceramic)"
          strokeWidth="13"
          strokeLinecap="round"
        />

        {/* Porcelain Cup Rim */}
        <circle
          cx="140"
          cy="146"
          r="66"
          fill="var(--cc-cup-ceramic)"
          stroke="var(--cc-cup-rim)"
          strokeWidth="1.5"
        />

        {/* Liquid Surface — smoothly transitions Decaf <-> Medium Roast <-> Dark Espresso */}
        <circle
          cx="140"
          cy="146"
          r="54"
          className="cc-cup-brew"
        />

        {/* Golden Crema Crescent & Swirling Aroma Ring (fades away on Decaf) */}
        <g
          className="cc-cup-crema-group"
          style={{
            transform: `rotate(${cremaRotate}deg)`,
            transformOrigin: "140px 146px",
          }}
        >
          <path
            d="M 96 146 A 44 44 0 0 1 178 124 C 154 128, 128 140, 108 164 A 44 44 0 0 1 96 146 Z"
            className="cc-cup-crema"
          />
          <circle
            cx="140"
            cy="146"
            r={isCraft ? 46 : 42}
            fill="none"
            className="cc-cup-crema-ring"
            strokeWidth={isCraft ? 3 : 2}
            strokeDasharray={isCraft ? "92 26 42 22" : "68 38 30 34"}
            strokeLinecap="round"
          />
          {/* Subtle single roasted coffee bean silhouette floating in the crema */}
          <g
            className="cc-cup-bean"
            transform="translate(140 146) rotate(-24)"
          >
            <ellipse cx="0" cy="0" rx="9" ry="13" fill="var(--cc-cup-bean-fill)" />
            <path
              d="M 0 -12 C 3 -5, -3 5, 0 12"
              fill="none"
              stroke="var(--cc-crema)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* Delicate Rising Steam Ribbons (vanish when Default AI / Decaf) */}
        <g className="cc-cup-steam">
          <path
            className="cc-steam-line cc-steam-1"
            d="M 122 106 C 116 92, 128 82, 122 68"
            fill="none"
            stroke="var(--cc-roast-muted)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            className="cc-steam-line cc-steam-2"
            d="M 142 98 C 136 82, 150 70, 142 54"
            fill="none"
            stroke="var(--cc-crema-deep)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className="cc-steam-line cc-steam-3"
            d="M 162 108 C 156 94, 168 84, 162 72"
            fill="none"
            stroke="var(--cc-roast-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Clean Roast Extraction Readout tucked naturally beneath the saucer */}
      <div className="cc-cup-caption">
        <span className="cc-cup-roast-dot" />
        <span>
          {isDecaf
            ? "Decaf · Default AI (50/50)"
            : isCraft
              ? "Dark Roast · Proven craft first"
              : "Light Roast · Learning speed first"}
        </span>
      </div>
    </div>
  );
}
