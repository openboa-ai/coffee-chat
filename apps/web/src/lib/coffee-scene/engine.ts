import * as THREE from "three";
import {
  createBeanRoastTextures,
  createContactShadowTexture,
  createPorcelainBumpTexture,
  createStudioEnvironment,
} from "./textures";
import {
  createCoffeeBeanGeometry,
  createCoffeeCupAssembly,
  createPourStream,
  createTableBridge,
} from "./geometries";

export type StageRoastMode = "decaf" | "growth" | "craft";
export type StageChatPartner = "claire" | "david" | "both";

export interface CoffeeStageInput {
  scrollProgress: number; // 0..1 continuous across 5 acts
  appearance: "light" | "dark";
  roastMode: StageRoastMode;
  roastConfirmed: boolean;
  brewActive: boolean;
  boundaryTriggered: boolean;
  chatPartner: StageChatPartner;
  holding: boolean;
  rippleNonce: number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Mounts the persistent, full-viewport Three.js PBR Coffee World engine.
 * Zero React re-renders per frame; reads live state smoothly from stateRef.
 */
export function mountCoffeeWorldEngine(
  container: HTMLElement,
  stateRef: { current: CoffeeStageInput },
  callbacks?: {
    onActChange?: (actIndex: number) => void;
    onHoldBurst?: () => void;
  },
): () => void {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return () => {};
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, Math.max(window.innerHeight, 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const scene = new THREE.Scene();

  // Procedural studio softbox HDRI reflections
  const studioEnv = createStudioEnvironment(renderer);
  scene.environment = studioEnv;
  scene.environmentIntensity = 1.05;

  const camera = new THREE.PerspectiveCamera(
    36,
    window.innerWidth / Math.max(window.innerHeight, 1),
    0.1,
    100,
  );
  camera.position.set(0, 3.1, 9.2);

  // Studio 3-point photography lighting
  const hemiLight = new THREE.HemisphereLight(0xfff7ec, 0x3b2a1e, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1de, 2.35);
  keyLight.position.set(-4.5, 8.2, 6.0);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x79b3d6, 1.25);
  rimLight.position.set(7.5, 4.5, -5.5);
  scene.add(rimLight);

  const warmFill = new THREE.PointLight(0xe59c52, 1.35, 22, 1.6);
  warmFill.position.set(2.5, 3.2, 4.5);
  scene.add(warmFill);

  // Shared procedural textures
  const porcelainBump = createPorcelainBumpTexture();
  const contactShadowTex = createContactShadowTexture();
  const beanTextures = createBeanRoastTextures();

  // Root world group (shifts gently on narrow screens vs desktop right-half framing)
  const world = new THREE.Group();
  scene.add(world);

  // 1. Primary Ivory Porcelain Cup (Act 01 Hero, Act 03 Brew target, Act 04 @claire/You)
  const primaryCup = createCoffeeCupAssembly({
    variant: "primary",
    porcelainBump,
    contactShadowTex,
  });
  world.add(primaryCup.group);

  // 2. Partner Ink-Slate Stoneware Cup (Glides in during Act 04 Coffee Chat for @david)
  const partnerCup = createCoffeeCupAssembly({
    variant: "partner",
    porcelainBump,
    contactShadowTex,
  });
  partnerCup.group.position.set(8.5, 0, -1.2);
  partnerCup.group.scale.setScalar(0.001);
  world.add(partnerCup.group);

  // 3. Glossy 3D Espresso Pour Stream (Act 03 Brew Everywhere)
  const pourStream = createPourStream();
  primaryCup.group.add(pourStream.mesh);

  // 4. Two-Cup Coffee Chat Perspective Bridge (Act 04)
  const tableBridge = createTableBridge();
  world.add(tableBridge.group);

  // 5. Hero Macro 3D Roasted Bean (Act 02 centerpiece + Hero Drop Bean!)
  const beanGeo = createCoffeeBeanGeometry();
  const heroBeanMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x522e19),
    map: beanTextures.map,
    bumpMap: beanTextures.bumpMap,
    bumpScale: 0.042,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.36,
    clearcoatRoughness: 0.28,
    emissive: new THREE.Color(0x1f0d04),
    emissiveIntensity: 0.0,
  });
  const heroBean = new THREE.Mesh(beanGeo, heroBeanMat);
  heroBean.position.set(2.5, 2.8, 0.2);
  world.add(heroBean);

  // Subtle architectural orbital ring framing the Hero Bean in Act 02
  const roastRingGeo = new THREE.TorusGeometry(1.38, 0.011, 12, 96);
  const roastRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x175174),
    transparent: true,
    opacity: 0,
  });
  const roastRing = new THREE.Mesh(roastRingGeo, roastRingMat);
  roastRing.rotation.x = Math.PI * 0.36;
  world.add(roastRing);

  // 6. Curated Instanced Orbital Roasted Coffee Beans (30 sculpted 3D beans in right-stage halo)
  const BEAN_COUNT = 30;
  const instBeanMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    map: beanTextures.map,
    bumpMap: beanTextures.bumpMap,
    bumpScale: 0.028,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.36,
    clearcoatRoughness: 0.26,
  });
  const instBeans = new THREE.InstancedMesh(beanGeo, instBeanMat, BEAN_COUNT);
  world.add(instBeans);

  // Deterministic PRNG for clean right-stage sculptural bean halo (never blocking left copy!)
  let seed = 42019;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  interface BeanOrbitMeta {
    angle: number;
    radius: number;
    height: number;
    speed: number;
    scale: number;
    rotSpeed: THREE.Vector3;
    rotPhase: THREE.Vector3;
    arcX: number;
    arcY: number;
    arcZ: number;
    horizonX: number;
    horizonY: number;
    horizonZ: number;
  }

  const beanMeta: BeanOrbitMeta[] = [];
  const tmpColor = new THREE.Color();
  const roastShades = [0x593119, 0x452310, 0x6b3d20, 0x381b0c, 0x7b4a2a];

  for (let i = 0; i < BEAN_COUNT; i++) {
    const frac = i / BEAN_COUNT;
    // Place beans in a graceful elevated halo behind/right of the cup
    const angle = frac * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const radius = 2.55 + rand() * 1.95;
    const height = 1.45 + rand() * 2.25;
    const scale = 0.16 + Math.pow(rand(), 1.5) * 0.17;

    // Act 02 sweeping priority arc strictly on the right stage
    const arcT = (frac - 0.5) * Math.PI * 0.95;
    const arcX = Math.sin(arcT) * 2.35;
    const arcY = 0.9 + Math.cos(arcT * 2.0) * 0.85 + (rand() - 0.5) * 0.55;
    const arcZ = -1.65 + Math.cos(arcT) * 0.95 + (rand() - 0.5) * 0.55;

    // Act 05 calm right-weighted floating horizon constellation
    const horizonX = 0.8 + rand() * 4.6;
    const horizonY = 0.4 + rand() * 3.8;
    const horizonZ = -3.4 + rand() * 2.4;

    beanMeta.push({
      angle,
      radius,
      height,
      speed: (0.10 + rand() * 0.18) * (i % 2 === 0 ? 1 : -1),
      scale,
      rotSpeed: new THREE.Vector3(
        0.26 + rand() * 0.45,
        0.22 + rand() * 0.55,
        0.18 + rand() * 0.4,
      ),
      rotPhase: new THREE.Vector3(
        rand() * Math.PI * 2,
        rand() * Math.PI * 2,
        rand() * Math.PI * 2,
      ),
      arcX,
      arcY,
      arcZ,
      horizonX,
      horizonY,
      horizonZ,
    });

    tmpColor.setHex(roastShades[i % roastShades.length]!);
    instBeans.setColorAt(i, tmpColor);
  }
  if (instBeans.instanceColor) instBeans.instanceColor.needsUpdate = true;

  // Color constants for smooth Light/Dark background polarity
  const lightBg = new THREE.Color(0xf6f1e8); // Warm studio linen (matches Coffee Chat earth-50)
  const darkBg = new THREE.Color(0x0c0a09);  // Deep roasted obsidian
  const curBg = new THREE.Color();

  const rawBeanCol = new THREE.Color(0x6e482b);
  const roastedBeanCol = new THREE.Color(0x2f160a);
  const emberGlowCol = new THREE.Color(0x7a3d16);
  const ringLightCol = new THREE.Color(0x175174);
  const ringDarkCol = new THREE.Color(0x79b3d6);

  // Smooth physics state
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollSmooth = stateRef.current.scrollProgress;
  let polaritySmooth = stateRef.current.appearance === "dark" ? 1 : 0;
  let roastLevelSmooth =
    stateRef.current.roastMode === "decaf"
      ? 0.0
      : stateRef.current.roastMode === "craft"
        ? 1.0
        : 0.55;
  let roastConfirmSmooth = stateRef.current.roastConfirmed ? 1 : 0;
  let brewPourSmooth = stateRef.current.brewActive ? 1 : 0;
  let boundarySmooth = stateRef.current.boundaryTriggered ? 1 : 0;
  let partnerFocusSmooth =
    stateRef.current.chatPartner === "david"
      ? 1
      : stateRef.current.chatPartner === "both"
        ? 0.5
        : 0;

  let pointerHolding = false;
  let wasHolding = false;
  let charge = 0;
  let burst = 0;
  let dropAnim = 1; // 0..1 when dropping a bean into the cup
  let rippleTime = 4.0;
  let rippleStrength = 0.0;
  let lastRippleNonce = stateRef.current.rippleNonce;
  let lastReportedAct = 0;
  let contextLost = false;

  const triggerSplash = (strength = 1.0) => {
    rippleTime = 0.0;
    rippleStrength = strength;
    dropAnim = 0.0;
  };

  // Input listeners
  const onPointerMove = (e: PointerEvent) => {
    ptr.tx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
    ptr.ty = -(e.clientY / Math.max(window.innerHeight, 1)) * 2 + 1;
  };

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest("a, button, input, textarea, select, [role='radio'], [role='switch'], header, nav")) {
      return;
    }
    pointerHolding = true;
  };

  const onPointerUp = () => {
    pointerHolding = false;
  };

  const onResize = () => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
  };
  const onContextRestored = () => {
    contextLost = false;
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  window.addEventListener("resize", onResize);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  const dummy = new THREE.Object3D();
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const curLook = new THREE.Vector3(1.1, 0.85, 0);

  let rafId = 0;
  const startNow = performance.now();
  let prevNow = startNow;

  const animate = (now: number) => {
    if (contextLost) return;
    rafId = requestAnimationFrame(animate);
    if (document.hidden) {
      prevNow = now;
      return;
    }

    const dt = Math.min((now - prevNow) * 0.001, 0.05);
    prevNow = now;
    const t = reducedMotion ? 0 : (now - startNow) * 0.001;
    const st = stateRef.current;

    // Detect explicit ripple trigger from interactive UI controls
    if (st.rippleNonce !== lastRippleNonce) {
      lastRippleNonce = st.rippleNonce;
      triggerSplash(1.0);
    }

    // Smooth interpolation of scroll, appearance, and interactive states
    const lerpFast = reducedMotion ? 1 : 0.1;
    const lerpMed = reducedMotion ? 1 : 0.075;

    scrollSmooth += (st.scrollProgress - scrollSmooth) * lerpMed;
    const targetPol = st.appearance === "dark" ? 1 : 0;
    polaritySmooth += (targetPol - polaritySmooth) * lerpFast;

    const targetRoastLevel =
      st.roastMode === "decaf" ? 0.0 : st.roastMode === "craft" ? 1.0 : 0.56;
    roastLevelSmooth += (targetRoastLevel - roastLevelSmooth) * lerpFast;

    roastConfirmSmooth += ((st.roastConfirmed ? 1 : 0) - roastConfirmSmooth) * lerpFast;
    brewPourSmooth +=
      ((st.brewActive && !st.boundaryTriggered ? 1 : 0) - brewPourSmooth) * lerpFast;
    boundarySmooth += ((st.boundaryTriggered ? 1 : 0) - boundarySmooth) * lerpFast;

    const targetPartnerFocus =
      st.chatPartner === "david" ? 1 : st.chatPartner === "both" ? 0.5 : 0;
    partnerFocusSmooth += (targetPartnerFocus - partnerFocusSmooth) * lerpFast;

    ptr.x += (ptr.tx - ptr.x) * 0.07;
    ptr.y += (ptr.ty - ptr.y) * 0.07;

    // Hold-to-Pour vortex physics
    const isHoldingNow = !reducedMotion && (pointerHolding || st.holding);
    if (isHoldingNow) {
      charge = Math.min(1, charge + dt * 1.45);
    } else {
      if (wasHolding && charge > 0.14) {
        burst = Math.min(1.0, charge * 1.15);
        triggerSplash(1.25);
        callbacks?.onHoldBurst?.();
      }
      charge = Math.max(0, charge - dt * 2.2);
    }
    wasHolding = isHoldingNow;
    burst = Math.max(0, burst - dt * 1.8);

    document.documentElement.style.setProperty("--cc-hold-charge", charge.toFixed(3));

    // Ripple & drop progression
    rippleTime += dt;
    rippleStrength = Math.max(0, rippleStrength - dt * 0.55);
    dropAnim = Math.min(1, dropAnim + dt * 1.85);

    // Report active 5-Act index smoothly
    const actIdx =
      scrollSmooth < 0.17
        ? 0
        : scrollSmooth < 0.39
          ? 1
          : scrollSmooth < 0.62
            ? 2
            : scrollSmooth < 0.85
              ? 3
              : 4;
    if (actIdx !== lastReportedAct) {
      lastReportedAct = actIdx;
      callbacks?.onActChange?.(actIdx);
    }

    // 5-Act continuous scroll weights
    const s = scrollSmooth;
    const wAct2 = smoothstep(0.14, 0.27, s) * (1 - smoothstep(0.38, 0.50, s));
    const wAct3 = smoothstep(0.39, 0.51, s) * (1 - smoothstep(0.61, 0.72, s));
    const wAct4 = smoothstep(0.62, 0.74, s) * (1 - smoothstep(0.86, 0.94, s));
    const wAct5 = smoothstep(0.85, 0.96, s);

    // Responsive framing: push 3D stage cleanly into right 55% on desktop; elevate to top showcase on mobile
    const isNarrow = window.innerWidth < 900;
    const rightAnchor = isNarrow ? 0.0 : 2.65;
    const cupScaleBase = isNarrow ? 0.56 : 1.04;

    // Background & Lighting polarity
    curBg.copy(lightBg).lerp(darkBg, polaritySmooth);
    renderer.setClearColor(curBg, 1);
    hemiLight.intensity = THREE.MathUtils.lerp(0.84, 0.46, polaritySmooth);
    keyLight.intensity = THREE.MathUtils.lerp(2.35, 2.65, polaritySmooth);
    rimLight.intensity = THREE.MathUtils.lerp(1.15, 2.05, polaritySmooth);
    warmFill.intensity = THREE.MathUtils.lerp(1.25, 1.95, polaritySmooth);

    // ------------------------------------------------------------------------
    // PRIMARY IVORY CUP CHOREOGRAPHY
    // ------------------------------------------------------------------------
    const cupX =
      rightAnchor +
      wAct2 * (isNarrow ? 0.0 : 1.65) +
      wAct3 * (isNarrow ? 0.0 : 0.15) +
      wAct4 * (isNarrow ? -1.05 : -0.78) +
      wAct5 * (isNarrow ? -0.75 : -0.45);

    const cupY =
      (isNarrow ? 2.15 : -0.35) +
      wAct2 * (isNarrow ? -1.4 : -1.95) +
      wAct3 * (isNarrow ? -0.25 : -0.45) +
      wAct4 * (isNarrow ? -0.10 : -0.40) +
      wAct5 * (isNarrow ? -0.20 : -0.55) +
      (reducedMotion ? 0 : Math.sin(t * 1.1) * 0.045 * (1 - wAct4 * 0.75));

    const cupZ =
      0.0 + wAct2 * -2.2 + wAct3 * 0.35 + wAct4 * 0.15 + wAct5 * -0.4;

    const cupScale =
      cupScaleBase * (1 - wAct2 * 0.46 + wAct3 * 0.06 - wAct4 * 0.22 - wAct5 * 0.18);

    primaryCup.group.position.set(cupX, cupY, cupZ);
    primaryCup.group.scale.setScalar(cupScale);
    primaryCup.group.rotation.y =
      -0.42 +
      wAct3 * 0.32 +
      wAct4 * 0.45 +
      (reducedMotion ? 0 : ptr.x * 0.14 + Math.sin(t * 0.42) * 0.05);
    primaryCup.group.rotation.x =
      0.08 * (1 - wAct4) + (reducedMotion ? 0 : -ptr.y * 0.07);
    primaryCup.group.rotation.z = reducedMotion ? 0 : -ptr.x * 0.04;

    // Effective roast level in primary cup
    const act1Roast = roastLevelSmooth;
    const act3Roast = st.brewActive ? 0.62 : 0.08;
    const effectivePrimaryRoast = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(act1Roast, act3Roast, wAct3),
      0.64,
      clamp01(wAct4 + wAct5),
    );

    const pourStrength = wAct3 * brewPourSmooth;
    primaryCup.cremaUniforms.uTime!.value = t;
    primaryCup.cremaUniforms.uRoastLevel!.value = effectivePrimaryRoast;
    primaryCup.cremaUniforms.uSwirlSpeed!.value =
      0.6 + effectivePrimaryRoast * 1.2 + charge * 2.8 + pourStrength * 1.5;
    primaryCup.cremaUniforms.uRippleTime!.value = rippleTime;
    primaryCup.cremaUniforms.uRippleStrength!.value = rippleStrength + burst * 0.6;
    primaryCup.cremaUniforms.uPourImpact!.value = pourStrength;
    primaryCup.cremaUniforms.uBoundaryAlert!.value = wAct3 * boundarySmooth;

    primaryCup.steamUniforms.uTime!.value = t;
    primaryCup.steamUniforms.uWindX!.value = ptr.x;
    primaryCup.steamUniforms.uPolarity!.value = polaritySmooth;
    primaryCup.steamUniforms.uSteamIntensity!.value =
      smoothstep(0.06, 0.35, effectivePrimaryRoast) *
      (1.0 - wAct2 * 0.85) *
      (wAct4 > 0.1 ? 0.68 + (1 - partnerFocusSmooth) * 0.45 : 1.0);
    primaryCup.shadowMaterial.opacity = THREE.MathUtils.lerp(0.40, 0.24, polaritySmooth);

    // ------------------------------------------------------------------------
    // PARTNER INK-SLATE CUP CHOREOGRAPHY (Glides cleanly right in Act 04!)
    // ------------------------------------------------------------------------
    const partnerPresence = clamp01(wAct4 + wAct5 * 0.85);
    const partnerX = THREE.MathUtils.lerp(
      rightAnchor + 7.6,
      rightAnchor + (isNarrow ? 1.15 : 2.05),
      partnerPresence,
    );
    const partnerY =
      (isNarrow ? 1.40 : -0.75) + (reducedMotion ? 0 : Math.cos(t * 1.05) * 0.03 * wAct5);
    const partnerZ = THREE.MathUtils.lerp(-2.4, 0.05, partnerPresence);
    const partnerScale =
      cupScaleBase *
      0.80 *
      THREE.MathUtils.lerp(0.001, 1.0, smoothstep(0.02, 0.35, partnerPresence));

    partnerCup.group.visible = partnerPresence > 0.02;
    partnerCup.group.position.set(partnerX, partnerY, partnerZ);
    partnerCup.group.scale.setScalar(partnerScale);
    partnerCup.group.rotation.y =
      Math.PI + 0.45 + (reducedMotion ? 0 : ptr.x * 0.12);
    partnerCup.group.rotation.x = reducedMotion ? 0 : -ptr.y * 0.06;

    partnerCup.cremaUniforms.uTime!.value = t;
    partnerCup.cremaUniforms.uRoastLevel!.value = 0.95;
    partnerCup.cremaUniforms.uSwirlSpeed!.value = 1.0 + partnerFocusSmooth * 1.4;
    partnerCup.cremaUniforms.uRippleTime!.value = rippleTime;
    partnerCup.cremaUniforms.uRippleStrength!.value =
      wAct4 * partnerFocusSmooth * rippleStrength * 0.9;
    partnerCup.steamUniforms.uTime!.value = t + 2.3;
    partnerCup.steamUniforms.uWindX!.value = ptr.x;
    partnerCup.steamUniforms.uPolarity!.value = polaritySmooth;
    partnerCup.steamUniforms.uSteamIntensity!.value =
      partnerPresence * (0.48 + partnerFocusSmooth * 0.62);

    // ------------------------------------------------------------------------
    // GLOSSY 3D ESPRESSO POUR STREAM (Act 03)
    // ------------------------------------------------------------------------
    pourStream.mesh.visible = pourStrength > 0.02;
    pourStream.uniforms.uTime!.value = t;
    pourStream.uniforms.uPourOpacity!.value = pourStrength;

    // ------------------------------------------------------------------------
    // TWO-CUP PERSPECTIVE BRIDGE (Act 04)
    // ------------------------------------------------------------------------
    tableBridge.group.position.set(
      (cupX + partnerX) * 0.5,
      isNarrow ? 1.25 : -0.48,
      (cupZ + partnerZ) * 0.5,
    );
    tableBridge.group.scale.setScalar(isNarrow ? 0.65 : 0.92);
    tableBridge.update({
      time: t,
      visibility: wAct4,
      direction:
        st.chatPartner === "claire"
          ? -1
          : st.chatPartner === "david"
            ? 1
            : 0,
      polarity: polaritySmooth,
    });

    // ------------------------------------------------------------------------
    // HERO MACRO 3D ROASTED BEAN (Act 02 Centerpiece + Hero Splash Drop)
    // ------------------------------------------------------------------------
    const dropArcY =
      dropAnim < 1
        ? THREE.MathUtils.lerp(cupY + 3.0, cupY + 1.25, dropAnim * dropAnim)
        : cupY + 2.65 + Math.sin(t * 1.4) * 0.12;
    const dropScale =
      dropAnim < 1 ? Math.sin(dropAnim * Math.PI) * 0.46 : 0.001;

    const act2BeanX = rightAnchor + (isNarrow ? 0 : 0.05);
    const act2BeanY = (isNarrow ? 1.85 : 0.78) + (reducedMotion ? 0 : Math.sin(t * 1.25) * 0.10);
    const act2BeanZ = 0.85;

    const heroBeanX = THREE.MathUtils.lerp(cupX + 0.05, act2BeanX, wAct2);
    const heroBeanY = THREE.MathUtils.lerp(dropArcY, act2BeanY, wAct2);
    const heroBeanZ = THREE.MathUtils.lerp(cupZ + 0.05, act2BeanZ, wAct2);
    const heroBeanScale = THREE.MathUtils.lerp(
      dropScale * (1 - wAct3 - wAct4 - wAct5),
      isNarrow ? 1.25 : 1.72,
      wAct2,
    );

    heroBean.visible = heroBeanScale > 0.04;
    heroBean.position.set(heroBeanX, heroBeanY, heroBeanZ);
    heroBean.scale.setScalar(Math.max(0.001, heroBeanScale));
    heroBean.rotation.set(
      0.28 + (reducedMotion ? 0 : ptr.y * 0.35 + Math.sin(t * 0.7) * 0.14),
      (reducedMotion ? 0.35 : t * 0.55 + ptr.x * 0.7 + roastConfirmSmooth * Math.PI),
      0.24 + Math.sin(t * 0.5) * 0.08,
    );

    // Rich authentic dark-mahogany Arabica roast transition (never flat plastic orange!)
    heroBeanMat.color.copy(rawBeanCol).lerp(roastedBeanCol, 0.25 + roastConfirmSmooth * 0.75);
    heroBeanMat.emissive.copy(emberGlowCol);
    heroBeanMat.emissiveIntensity =
      wAct2 * (0.04 + roastConfirmSmooth * (0.12 + Math.sin(t * 2.8) * 0.04));
    heroBeanMat.roughness = THREE.MathUtils.lerp(0.54, 0.34, roastConfirmSmooth);
    heroBeanMat.clearcoat = THREE.MathUtils.lerp(0.22, 0.52, roastConfirmSmooth);

    // Subtle orbital ring framing the hero bean in Act 02
    roastRing.visible = wAct2 > 0.04;
    roastRing.position.set(act2BeanX, act2BeanY, act2BeanZ - 0.1);
    roastRing.scale.setScalar((isNarrow ? 0.72 : 1.04) * (0.88 + roastConfirmSmooth * 0.18));
    roastRing.rotation.z = t * 0.32;
    roastRingMat.color
      .copy(ringLightCol)
      .lerp(ringDarkCol, polaritySmooth);
    roastRingMat.opacity = wAct2 * (0.16 + roastConfirmSmooth * 0.22);

    // ------------------------------------------------------------------------
    // 30 CURATED ORBITAL ROASTED COFFEE BEANS (Zero text overlap + Zero cup clipping!)
    // ------------------------------------------------------------------------
    const decafScatter = (1 - smoothstep(0.05, 0.4, effectivePrimaryRoast)) * (1 - wAct2 - wAct4 - wAct5);
    const minRightX = isNarrow ? -4.0 : 0.42;

    for (let i = 0; i < BEAN_COUNT; i++) {
      const m = beanMeta[i]!;
      const orbAngle = m.angle + (reducedMotion ? 0 : t * m.speed + charge * 1.8);
      const rBoost =
        m.radius * (1.0 + decafScatter * 0.35 - charge * 0.38 + burst * 0.7);

      // Sculptural halo centered softly behind/right of the stage
      const ox = rightAnchor + 0.35 + Math.cos(orbAngle) * rBoost * 0.78;
      const oy =
        (isNarrow ? 1.8 : 0.0) +
        m.height +
        Math.sin(t * 0.6 + m.angle) * 0.22 -
        charge * 0.28 * (m.height - 1.2);
      const oz = -1.65 + Math.sin(orbAngle) * rBoost * 0.52;

      // Blend smoothly: Halo -> Act 02 Priority Arc -> Act 05 Calm Horizon
      let bx = THREE.MathUtils.lerp(ox, rightAnchor + m.arcX, wAct2);
      let by = THREE.MathUtils.lerp(oy, (isNarrow ? 1.5 : 0.0) + m.arcY, wAct2);
      let bz = THREE.MathUtils.lerp(oz, m.arcZ, wAct2);

      // In Act 03 (Brew), pull a few beans softly above the espresso pour stream
      if (wAct3 > 0.01) {
        const pourPull = smoothstep(0, 1, wAct3) * (i % 4 === 0 ? 0.48 : 0.14);
        bx = THREE.MathUtils.lerp(bx, cupX + 0.42 + Math.cos(orbAngle) * 0.95, pourPull);
        by = THREE.MathUtils.lerp(by, cupY + 4.05 + Math.sin(orbAngle) * 0.35, pourPull);
      }

      bx = THREE.MathUtils.lerp(bx, m.horizonX, wAct5);
      by = THREE.MathUtils.lerp(
        by,
        (isNarrow ? 1.4 : 0.0) + m.horizonY + (reducedMotion ? 0 : Math.sin(t * 0.4 + i) * 0.2),
        wAct5,
      );
      bz = THREE.MathUtils.lerp(bz, m.horizonZ, wAct5);

      // Keep beans cleanly out of the left desktop typography corridor!
      if (!isNarrow && bx < minRightX) {
        bx = minRightX + (minRightX - bx) * 0.35;
        bz -= 0.75;
      }

      // Enforce hard collision exclusion around Primary Cup & Saucer (zero clipping!)
      const cdx = bx - cupX;
      const cdy = by - (cupY + 0.85);
      const cdz = bz - cupZ;
      const cDist = Math.hypot(cdx, cdy, cdz);
      const cupClearance = 2.35 * cupScale;
      if (cDist < cupClearance) {
        const push = (cupClearance - cDist) / Math.max(cDist, 0.001);
        bx += cdx * push;
        by += Math.max(0.25, cdy) * push;
        bz += (cdz < 0 ? cdz - 0.5 : cdz) * push;
      }

      // Enforce collision exclusion around Partner Cup in Act 04 / 05
      if (partnerCup.group.visible) {
        const pdx = bx - partnerX;
        const pdy = by - (partnerY + 0.85);
        const pdz = bz - partnerZ;
        const pDist = Math.hypot(pdx, pdy, pdz);
        const pClearance = 2.25 * partnerScale;
        if (pDist < pClearance) {
          const push = (pClearance - pDist) / Math.max(pDist, 0.001);
          bx += pdx * push;
          by += Math.max(0.25, pdy) * push;
          bz += (pdz < 0 ? pdz - 0.5 : pdz) * push;
        }
      }

      // Gentle cursor magnetic swirl
      if (!reducedMotion) {
        const dx = bx - ptr.x * 5.2;
        const dy = by - ptr.y * 3.0;
        const d2 = dx * dx + dy * dy;
        const push = Math.exp(-d2 * 0.16) * 0.45;
        bx += dx * push * 0.28;
        by += dy * push * 0.28;
      }

      dummy.position.set(bx, by, bz);
      dummy.rotation.set(
        m.rotPhase.x + t * m.rotSpeed.x,
        m.rotPhase.y + t * m.rotSpeed.y,
        m.rotPhase.z + t * m.rotSpeed.z,
      );
      const beanScale = m.scale * (isNarrow ? 0.72 : 0.92) * (1 + charge * 0.12);
      dummy.scale.setScalar(beanScale);
      dummy.updateMatrix();
      instBeans.setMatrixAt(i, dummy.matrix);
    }
    instBeans.instanceMatrix.needsUpdate = true;

    // ------------------------------------------------------------------------
    // CINEMATIC CAMERA CHOREOGRAPHY ACROSS ALL 5 ACTS
    // ------------------------------------------------------------------------
    const baseCamZ = isNarrow ? 10.6 : 8.75;
    const baseCamY = isNarrow ? 3.8 : 2.8;

    const targetCamX =
      (isNarrow ? 0 : 0.15) +
      wAct2 * (isNarrow ? 0 : 0.35) +
      wAct3 * (isNarrow ? 0 : -0.35) +
      wAct4 * ((partnerFocusSmooth - 0.5) * (isNarrow ? 0.7 : 0.78)) +
      (reducedMotion ? 0 : ptr.x * (isNarrow ? 0.32 : 0.65));

    const targetCamY =
      baseCamY +
      wAct2 * -1.25 +
      wAct3 * 0.52 +
      wAct4 * 1.48 +
      wAct5 * 0.45 +
      (reducedMotion ? 0 : ptr.y * (isNarrow ? 0.22 : 0.42));

    const targetCamZ =
      baseCamZ +
      wAct2 * -0.95 +
      wAct3 * 0.25 +
      wAct4 * 1.65 +
      wAct5 * 1.65 -
      charge * 0.7;

    camTarget.set(targetCamX, targetCamY, targetCamZ);
    camera.position.lerp(camTarget, lerpMed);

    lookTarget.set(
      (isNarrow ? 0.0 : 0.75) +
        wAct2 * (isNarrow ? 0 : 0.45) +
        wAct4 * ((partnerFocusSmooth - 0.5) * 0.42 + (isNarrow ? 0 : 0.42)),
      (isNarrow ? 0.85 : 0.48) + wAct2 * 0.18 + wAct3 * 0.32 - wAct4 * 0.12,
      0.0,
    );
    curLook.lerp(lookTarget, lerpMed);
    camera.lookAt(curLook);

    renderer.render(scene, camera);
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);

    primaryCup.dispose();
    partnerCup.dispose();
    pourStream.dispose();
    tableBridge.dispose();
    beanGeo.dispose();
    heroBeanMat.dispose();
    instBeanMat.dispose();
    roastRingGeo.dispose();
    roastRingMat.dispose();
    porcelainBump.dispose();
    contactShadowTex.dispose();
    beanTextures.map.dispose();
    beanTextures.bumpMap.dispose();
    studioEnv.dispose();
    renderer.dispose();
    if (canvas.parentElement === container) {
      container.removeChild(canvas);
    }
  };
}
