"use client";

import { useEffect, useRef } from "react";

export interface TasteFieldCanvasProps {
  /**
   * 0..100 priority pull from the interactive hero Taste Beam:
   * - 50 = unfocused default AI scatter (no priority pull)
   * - < 45 = strong directional current pulling left
   * - > 55 = strong directional current pulling right
   */
  bias: number;
}

interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  weight: number;
  ringDist: number;
}

/**
 * Bespoke, lightweight 2D Canvas ambient physics field for Coffee Chat.
 * Resolves live Yogurt CSS color tokens via hidden computed-style probe spans so
 * CSS `light-dark()` / `oklch()` expressions resolve to real Canvas-safe colors
 * in both Light and Dark polarity with zero hardcoded hex strings.
 */
export function TasteFieldCanvas({ bias }: TasteFieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandProbeRef = useRef<HTMLSpanElement>(null);
  const mutedProbeRef = useRef<HTMLSpanElement>(null);
  const borderProbeRef = useRef<HTMLSpanElement>(null);
  const biasTargetRef = useRef(bias);

  useEffect(() => {
    biasTargetRef.current = bias;
  }, [bias]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let brandColor = "currentColor";
    let mutedColor = "currentColor";
    let borderColor = "currentColor";
    let isDarkSurface = false;

    const readThemeTokens = () => {
      if (brandProbeRef.current) {
        brandColor = window.getComputedStyle(brandProbeRef.current).color;
      }
      if (mutedProbeRef.current) {
        mutedColor = window.getComputedStyle(mutedProbeRef.current).color;
      }
      if (borderProbeRef.current) {
        borderColor = window.getComputedStyle(borderProbeRef.current).color;
      }
      const rootEl = canvas.closest(".yg-root");
      const appAttr = rootEl?.getAttribute("data-appearance");
      isDarkSurface =
        appAttr === "dark" ||
        (appAttr !== "light" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(rect.width, 320);
      height = Math.max(rect.height, 420);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readThemeTokens();
    };

    resize();

    let seed = 4209;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const COUNT = width < 768 ? 58 : 112;
    const grains: Grain[] = Array.from({ length: COUNT }, () => {
      const angle = rand() * Math.PI * 2;
      const dist = 0.14 + Math.pow(rand(), 0.72) * 0.42;
      return {
        x: width * (0.52 + Math.cos(angle) * dist),
        y: height * (0.48 + Math.sin(angle) * dist * 0.82),
        vx: (rand() - 0.5) * 0.35,
        vy: (rand() - 0.5) * 0.35,
        radius: 1.05 + Math.pow(rand(), 1.9) * 1.95,
        phase: rand() * Math.PI * 2,
        weight: 0.45 + rand() * 0.85,
        ringDist: dist,
      };
    });

    const pointer = { x: -9999, y: -9999, active: false };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active =
        pointer.x >= 0 &&
        pointer.x <= rect.width &&
        pointer.y >= 0 &&
        pointer.y <= rect.height;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("resize", resize);

    const ygRoot = canvas.closest(".yg-root") ?? document.documentElement;
    const observer = new MutationObserver(() => {
      readThemeTokens();
    });
    observer.observe(ygRoot, {
      attributes: true,
      attributeFilter: ["data-appearance", "class"],
    });
    const mediaDark = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => readThemeTokens();
    mediaDark.addEventListener("change", onSchemeChange);

    let smoothBias = biasTargetRef.current;
    let frameId = 0;
    let time = 0;

    const drawFrame = (stepMotion: boolean) => {
      ctx.clearRect(0, 0, width, height);

      if (stepMotion) {
        smoothBias += (biasTargetRef.current - smoothBias) * 0.08;
        time += 0.012;
      } else {
        smoothBias = biasTargetRef.current;
      }

      const norm = (smoothBias - 50) / 50;
      const commitment = Math.min(1, Math.abs(norm) * 1.45);
      const isRight = norm >= 0;

      const anchorBaseX = width >= 960 ? width * 0.7 : width * 0.5;
      const anchorShift = width >= 960 ? width * 0.13 : width * 0.2;
      const attractorX = anchorBaseX + norm * anchorShift;
      const attractorY = height * (width >= 960 ? 0.48 : 0.34);

      const darkBoost = isDarkSurface ? 1.55 : 1;

      // Subtle architectural orbital guide rings around the active gravity pole
      ctx.save();
      ctx.strokeStyle = commitment > 0.18 ? brandColor : borderColor;
      ctx.globalAlpha = Math.min(0.28, (0.065 + commitment * 0.065) * darkBoost);
      ctx.lineWidth = 1;
      const baseR = Math.min(width, height) * 0.24;
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const radius = baseR * (0.58 + rIdx * 0.36);
        ctx.beginPath();
        ctx.ellipse(
          attractorX,
          attractorY,
          radius * (1 + commitment * 0.18),
          radius * (1 - commitment * 0.08),
          norm * 0.28,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < grains.length; i++) {
        const g = grains[i];
        if (!g) continue;

        if (stepMotion) {
          const wanderAngle =
            Math.sin(g.y * 0.006 + time + g.phase) * Math.PI +
            Math.cos(g.x * 0.005 - time * 0.8) * Math.PI;
          const scatterFx =
            Math.cos(wanderAngle) * 0.15 * (1 - commitment * 0.72);
          const scatterFy =
            Math.sin(wanderAngle) * 0.15 * (1 - commitment * 0.72);

          const dx = attractorX - g.x;
          const dy = attractorY - g.y;
          const dist = Math.hypot(dx, dy) || 1;
          const idealR = Math.min(width, height) * (0.11 + g.ringDist * 0.54);
          const radialPull = (dist - idealR) * 0.0014 * commitment * g.weight;

          const dirSign = isRight ? 1 : -1;
          const tangX = (-dy / dist) * dirSign;
          const tangY = (dx / dist) * dirSign;
          const swirlForce = (0.28 + commitment * 0.42) * g.weight;

          g.vx +=
            scatterFx + (dx / dist) * radialPull + tangX * swirlForce * 0.14;
          g.vy +=
            scatterFy + (dy / dist) * radialPull + tangY * swirlForce * 0.14;

          if (pointer.active) {
            const pdx = g.x - pointer.x;
            const pdy = g.y - pointer.y;
            const pDist = Math.hypot(pdx, pdy);
            if (pDist > 1 && pDist < 150) {
              const push = (1 - pDist / 150) * 0.55;
              g.vx += (pdx / pDist) * push;
              g.vy += (pdy / pDist) * push;
            }
          }

          g.vx *= 0.93;
          g.vy *= 0.93;
          g.x += g.vx;
          g.y += g.vy;

          if (g.x < -24) g.x = width + 24;
          if (g.x > width + 24) g.x = -24;
          if (g.y < -24) g.y = height + 24;
          if (g.y > height + 24) g.y = -24;
        }

        // Calm reading corridor over the left display typography on desktop
        const leftCalm =
          width >= 960
            ? Math.min(
                1,
                Math.max(0.12, (g.x - width * 0.18) / (width * 0.34)),
              )
            : 0.48;

        const speed = Math.hypot(g.vx, g.vy);
        const alpha = Math.min(
          0.62,
          (0.1 + commitment * 0.24 + Math.min(speed * 0.07, 0.14)) *
            leftCalm *
            darkBoost,
        );

        if (commitment > 0.12 && speed > 0.24) {
          ctx.beginPath();
          ctx.strokeStyle = brandColor;
          ctx.globalAlpha = alpha * 0.55;
          ctx.lineWidth = Math.max(0.75, g.radius * 0.55);
          ctx.moveTo(g.x, g.y);
          ctx.lineTo(
            g.x - g.vx * (5 + commitment * 6.5),
            g.y - g.vy * (5 + commitment * 6.5),
          );
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.fillStyle = commitment > 0.15 ? brandColor : mutedColor;
        ctx.globalAlpha = alpha;
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (reducedMotion) {
      drawFrame(false);
    } else {
      const loop = () => {
        drawFrame(true);
        frameId = window.requestAnimationFrame(loop);
      };
      frameId = window.requestAnimationFrame(loop);
    }

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      mediaDark.removeEventListener("change", onSchemeChange);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <span
        ref={brandProbeRef}
        className="cc-canvas-probe cc-canvas-probe-brand"
        aria-hidden="true"
      />
      <span
        ref={mutedProbeRef}
        className="cc-canvas-probe cc-canvas-probe-muted"
        aria-hidden="true"
      />
      <span
        ref={borderProbeRef}
        className="cc-canvas-probe cc-canvas-probe-border"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="cc-field-canvas" aria-hidden="true" />
    </>
  );
}
