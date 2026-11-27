"use client";

import { useEffect, useRef } from "react";
import {
  mountCoffeeWorldEngine,
  type CoffeeStageInput,
  type StageChatPartner,
  type StageRoastMode,
} from "@/lib/coffee-scene/engine";

export interface CoffeeWorldStageProps {
  roastMode: StageRoastMode;
  roastConfirmed: boolean;
  brewActive: boolean;
  boundaryTriggered: boolean;
  chatPartner: StageChatPartner;
  holding: boolean;
  rippleNonce: number;
  onActChange?: (actIndex: number) => void;
  onHoldBurst?: () => void;
}

function resolveDocumentAppearance(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const root = document.querySelector(".yg-root");
  const attr = root?.getAttribute("data-appearance");
  if (attr === "dark") return "dark";
  if (attr === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function CoffeeWorldStage({
  roastMode,
  roastConfirmed,
  brewActive,
  boundaryTriggered,
  chatPartner,
  holding,
  rippleNonce,
  onActChange,
  onHoldBurst,
}: CoffeeWorldStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onActChange, onHoldBurst });
  callbacksRef.current = { onActChange, onHoldBurst };

  const stateRef = useRef<CoffeeStageInput>({
    scrollProgress: 0,
    appearance: "light",
    roastMode,
    roastConfirmed,
    brewActive,
    boundaryTriggered,
    chatPartner,
    holding,
    rippleNonce,
  });

  // Push React interactive state directly into the imperative 3D ref (zero WebGL remounts)
  stateRef.current.roastMode = roastMode;
  stateRef.current.roastConfirmed = roastConfirmed;
  stateRef.current.brewActive = brewActive;
  stateRef.current.boundaryTriggered = boundaryTriggered;
  stateRef.current.chatPartner = chatPartner;
  stateRef.current.holding = holding;
  stateRef.current.rippleNonce = rippleNonce;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncAppearance = () => {
      stateRef.current.appearance = resolveDocumentAppearance();
    };
    const syncScroll = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      stateRef.current.scrollProgress = Math.min(
        1,
        Math.max(0, window.scrollY / maxScroll),
      );
    };

    syncAppearance();
    syncScroll();

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", syncAppearance);

    const rootEl = document.querySelector(".yg-root");
    const observer = rootEl
      ? new MutationObserver(syncAppearance)
      : null;
    if (rootEl && observer) {
      observer.observe(rootEl, {
        attributes: true,
        attributeFilter: ["data-appearance"],
      });
    }

    window.addEventListener("scroll", syncScroll, { passive: true });
    window.addEventListener("resize", syncScroll, { passive: true });

    const unmount = mountCoffeeWorldEngine(container, stateRef, {
      onActChange: (idx) => callbacksRef.current.onActChange?.(idx),
      onHoldBurst: () => callbacksRef.current.onHoldBurst?.(),
    });

    return () => {
      unmount();
      mql.removeEventListener("change", syncAppearance);
      observer?.disconnect();
      window.removeEventListener("scroll", syncScroll);
      window.removeEventListener("resize", syncScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="cc-stage-canvas"
      aria-hidden="true"
    />
  );
}
