import * as THREE from "three";

export type StageRoastMode = "decaf" | "growth" | "craft";
export type StageChatPartner = "claire" | "david" | "both";

export interface CoffeeCinemaInput {
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

const CINEMA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const CINEMA_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uTex0; // Act 01 & 05: Hero Espresso on Ink-Blue Saucer
  uniform sampler2D uTex1; // Act 02: Macro Roasted Beans & Cupping Spoon
  uniform sampler2D uTex2; // Act 03: Ink-Blue Gooseneck Kettle Pour
  uniform sampler2D uTex3; // Act 04: Two-Cup Café Table (@claire vs @david)

  uniform vec2 uResolution;
  uniform float uTexAspect;
  uniform float uTime;
  uniform float uScroll;         // 0..1 smooth scroll progress
  uniform float uDarkMode;       // 0 = warm sunlit studio, 1 = dark espresso bar
  uniform vec2 uCursor;          // 0..1 normalized viewport cursor
  uniform float uCursorEnergy;   // 0..1 pointer motion impulse

  uniform float uRoastLevel;     // 0 = decaf, 0.5 = growth, 1 = specialist
  uniform float uRoastConfirm;   // 0..1 confirmed roast glow in Act 02
  uniform float uBrewActive;     // 0..1 live pour glow in Act 03
  uniform float uBoundary;       // 0..1 warm amber boundary alert in Act 03
  uniform float uPartnerFocus;   // 0 = @claire, 0.5 = both, 1 = @david
  uniform float uCharge;         // 0..1 hold-to-pour lens pull
  uniform float uRippleTime;     // seconds since last click/drop ripple
  uniform float uRippleStrength; // 0..1.3 ripple amplitude
  uniform vec2 uRippleCenter;    // 0..1 viewport focal center for ripples
  uniform float uLoadedMask;     // 0..1 fade in once textures ready

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.02 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // Aspect-correct cover UV mapping with zero-stretch portrait showcase framing
  vec2 computeCoverUv(vec2 uv, float zoom, vec2 focalBias) {
    float screenAspect = uResolution.x / max(uResolution.y, 1.0);
    float portrait = smoothstep(1.05, 0.72, screenAspect);

    // On portrait screens, fit the right-half coffee subject cleanly into the upper 45% window
    vec2 scale = vec2(1.0);
    if (screenAspect > uTexAspect) {
      scale.y = uTexAspect / screenAspect;
    } else {
      scale.x = screenAspect / uTexAspect;
    }

    vec2 desktopUv = (uv - vec2(0.5)) * scale / zoom + vec2(0.5) + focalBias;

    // Dedicated portrait framing: focus cleanly on x=0.72 (the coffee cup/dish/pour/table),
    // lifted cleanly into the top 40% showcase window with mathematically zero edge clamping
    vec2 portraitDelta = vec2(uv.x - 0.5, uv.y - 0.785);
    vec2 portraitScale = vec2(0.56, 0.56 / max(screenAspect / uTexAspect, 0.25));
    vec2 portraitUv = vec2(0.72, 0.50) + portraitDelta * portraitScale / zoom + focalBias * 0.35;

    vec2 finalUv = mix(desktopUv, portraitUv, portrait);
    return clamp(finalUv, 0.002, 0.998);
  }

  vec3 adjustSaturation(vec3 col, float sat) {
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), col, sat);
  }

  void main() {
    vec2 uv = vUv;
    float screenAspect = uResolution.x / max(uResolution.y, 1.0);
    float portrait = smoothstep(1.08, 0.72, screenAspect);

    // 5-Act continuous scroll timeline weights
    float s = uScroll;
    float t01 = smoothstep(0.14, 0.27, s); // Hero -> Roast
    float t12 = smoothstep(0.38, 0.51, s); // Roast -> Brew
    float t23 = smoothstep(0.62, 0.74, s); // Brew -> Two-Cup Table
    float t34 = smoothstep(0.86, 0.96, s); // Table -> Closing Hero Horizon

    float wAct1 = (1.0 - t01);
    float wAct2 = t01 * (1.0 - t12);
    float wAct3 = t12 * (1.0 - t23);
    float wAct4 = t23 * (1.0 - t34);
    float wAct5 = t34;

    // Gentle living breathing zoom + cursor parallax + Hold-to-Pour lens draw
    vec2 parallax = (uCursor - 0.5) * vec2(-0.018, -0.014) * (1.0 - portrait * 0.6);
    float baseZoom = 1.02 + sin(uTime * 0.35) * 0.008 + uCharge * 0.055;

    // Act 04 subtle camera glide toward @claire (left cup) vs @david (right cup) keeping both cups in frame
    float tableShiftX = (uPartnerFocus - 0.5) * 0.032 * wAct4;
    float tableZoomBoost = abs(uPartnerFocus - 0.5) * 0.035 * wAct4;

    // Organic fluid liquid ripple from click/roast/hold-release centered on the active coffee cup
    vec2 aspectVec = vec2(screenAspect, 1.0);
    vec2 dRip = (uv - uRippleCenter) * aspectVec;
    float ripDist = length(dRip);
    float waveFront = uRippleTime * 0.78;
    float ripEnv = exp(-pow((ripDist - waveFront) * 9.0, 2.0)) * exp(-uRippleTime * 1.45) * uRippleStrength;
    float ripWave = sin((ripDist - waveFront) * 44.0) * ripEnv;
    vec2 ripOffset = normalize(dRip + 0.0001) * ripWave * 0.012;

    // Whisper-subtle pointer refraction on hover over coffee surface
    vec2 dCur = (uv - uCursor) * aspectVec;
    float curDist = length(dCur);
    float curWave = sin(curDist * 28.0 - uTime * 4.5) * exp(-curDist * curDist * 28.0) * uCursorEnergy * 0.0045;
    vec2 curOffset = normalize(dCur + 0.0001) * curWave;

    // Organic FBM fluid dissolve turbulence during scroll transitions
    float transPeak =
      sin(t01 * 3.14159) +
      sin(t12 * 3.14159) +
      sin(t23 * 3.14159) +
      sin(t34 * 3.14159);
    float fluidNoise = fbm(uv * 3.6 + vec2(uTime * 0.08, s * 2.4));
    vec2 dissolveWarp = (vec2(fluidNoise, fbm(uv * 3.6 + 4.1)) - 0.5) * 0.022 * clamp(transPeak, 0.0, 1.0);

    vec2 sampleUv = uv + ripOffset + curOffset + dissolveWarp;

    // Per-scene cover UVs with individual cinematic micro-motion
    vec2 uv0 = computeCoverUv(sampleUv, baseZoom + wAct1 * 0.015 + wAct5 * 0.03, parallax + vec2(0.0, wAct5 * 0.01));
    vec2 uv1 = computeCoverUv(sampleUv, baseZoom + 0.02 + uRoastConfirm * 0.035, parallax * 1.1);
    vec2 uv2 = computeCoverUv(sampleUv, baseZoom + 0.015 + uBrewActive * 0.025, parallax);
    vec2 uv3 = computeCoverUv(sampleUv, baseZoom + 0.02 + tableZoomBoost, parallax + vec2(tableShiftX, 0.0));

    // Sample our 4 studio-lit coffee photographs
    vec3 col0 = texture2D(uTex0, uv0).rgb;
    vec3 col1 = texture2D(uTex1, uv1).rgb;
    vec3 col2 = texture2D(uTex2, uv2).rgb;
    vec3 col3 = texture2D(uTex3, uv3).rgb;

    // Organic soft-edged crema dissolve blend masks (replaces flat crossfade!)
    float nMask = (fluidNoise - 0.5) * 0.24;
    float m01 = smoothstep(0.0, 1.0, clamp(t01 * 1.24 - 0.12 + nMask, 0.0, 1.0));
    float m12 = smoothstep(0.0, 1.0, clamp(t12 * 1.24 - 0.12 + nMask, 0.0, 1.0));
    float m23 = smoothstep(0.0, 1.0, clamp(t23 * 1.24 - 0.12 + nMask, 0.0, 1.0));
    float m34 = smoothstep(0.0, 1.0, clamp(t34 * 1.24 - 0.12 + nMask, 0.0, 1.0));

    vec3 col = mix(col0, col1, m01);
    col = mix(col, col2, m12);
    col = mix(col, col3, m23);
    col = mix(col, col0, m34);

    // ------------------------------------------------------------------------
    // LIVE INTERACTIVE PHOTOGRAPHIC GRADING PER ACT
    // ------------------------------------------------------------------------

    // Act 01: No Bean (pale cool decaf) vs Growth Roast (warm amber bloom) vs Specialist (rich deep ink contrast)
    float decafFactor = (1.0 - smoothstep(0.0, 0.42, uRoastLevel)) * wAct1;
    float craftFactor = smoothstep(0.55, 1.0, uRoastLevel) * wAct1;
    col = adjustSaturation(col, 1.0 - decafFactor * 0.68 + (1.0 - decafFactor) * wAct1 * 0.08 + craftFactor * 0.14);
    col = mix(col, col * vec3(0.95, 0.96, 0.99) + 0.05, decafFactor * 0.65);
    // Specialist roast: deepen espresso richness + distinct cool ink shadow depth
    col = mix(col, pow(max(col, 0.0), vec3(1.24, 1.15, 1.06)) * vec3(0.92, 0.97, 1.06), craftFactor * 0.62);

    // Act 02: Confirm & Roast Bean deepens warm mahogany saturation & subtle golden sunlight
    col = adjustSaturation(col, 1.0 + wAct2 * (uRoastConfirm * 0.24 - 0.08));
    col *= 1.0 - wAct2 * uRoastConfirm * 0.05 * vec3(0.2, 0.7, 1.2);

    // Act 03: Brew ON/OFF + Boundary Triggered warm amber vignette
    float brewOff = (1.0 - uBrewActive) * wAct3;
    col = adjustSaturation(col, 1.0 - brewOff * 0.58 + uBrewActive * wAct3 * 0.12);
    // Subtle luminous shimmer along the real photographed pour stream when Brew ON
    vec2 pourPos = mix(vec2(0.70, 0.56), vec2(0.52, 0.72), portrait);
    float pourSpot = exp(-dot((uv - pourPos) * vec2(14.0, 4.5), (uv - pourPos) * vec2(14.0, 4.5)));
    float pourShimmer = (0.5 + 0.5 * sin(uv.y * 55.0 + uTime * 11.0)) * pourSpot * wAct3 * uBrewActive * (1.0 - uBoundary);
    col += vec3(0.95, 0.64, 0.26) * pourShimmer * 0.14;

    // Boundary alert: delicate warm terracotta-amber architectural pulse on outer edge
    float edgeDist = length((uv - vec2(0.68, 0.5)) * aspectVec);
    float boundaryGlow = smoothstep(0.22, 0.68, edgeDist) * wAct3 * uBoundary * (0.72 + 0.28 * sin(uTime * 4.5));
    col = mix(col, col * vec3(1.06, 0.94, 0.88), boundaryGlow * 0.55);

    // Act 04: Dual-Cup spotlight shift (@claire left cup vs @david right cup)
    if (wAct4 > 0.01) {
      vec2 claireCupUv = mix(vec2(0.59, 0.50), vec2(0.32, 0.66), portrait);
      vec2 davidCupUv  = mix(vec2(0.83, 0.50), vec2(0.72, 0.66), portrait);
      float nearClaire = exp(-dot((uv - claireCupUv) * aspectVec * 2.4, (uv - claireCupUv) * aspectVec * 2.4));
      float nearDavid  = exp(-dot((uv - davidCupUv) * aspectVec * 2.4, (uv - davidCupUv) * aspectVec * 2.4));

      float focusClaire = max(0.0, 1.0 - uPartnerFocus * 2.0); // 1 when claire, 0 when both/david
      float focusDavid  = max(0.0, (uPartnerFocus - 0.5) * 2.0); // 1 when david, 0 when both/claire

      float dimRight = focusClaire * nearDavid * 0.22;
      float dimLeft  = focusDavid * nearClaire * 0.22;
      col *= 1.0 - (dimRight + dimLeft) * wAct4;
      col += vec3(0.98, 0.82, 0.58) * nearClaire * focusClaire * wAct4 * 0.05;
      col += vec3(0.28, 0.62, 0.84) * nearDavid * focusDavid * wAct4 * 0.06;
    }

    // Specular liquid glint along expanding ripple crest
    col += vec3(1.0, 0.96, 0.90) * max(0.0, ripWave) * 0.24;

    // ------------------------------------------------------------------------
    // DELICATE VOLUMETRIC CURLING STEAM & SUNLIT MORNING MOTES
    // ------------------------------------------------------------------------
    vec2 steamOrigin = mix(
      mix(vec2(0.71, 0.54), vec2(0.69, 0.58), wAct3),
      vec2(0.50, 0.68),
      portrait
    );
    vec2 stUv = (uv - steamOrigin) * vec2(3.6, 1.9);
    if (stUv.y > -0.15 && stUv.y < 1.15 && abs(stUv.x) < 1.2) {
      float curlX = stUv.x + sin(stUv.y * 4.2 - uTime * 1.1) * 0.16 - (uCursor.x - 0.5) * stUv.y * 0.25;
      float steamN = fbm(vec2(curlX * 2.2, stUv.y * 2.4 - uTime * 0.34));
      float steamMask = smoothstep(-0.08, 0.25, stUv.y) * smoothstep(1.05, 0.25, stUv.y) *
        exp(-curlX * curlX * 4.5) * smoothstep(0.38, 0.78, steamN);
      float steamActive = (1.0 - decafFactor) * (1.0 - wAct2 * 0.9) * (1.0 - brewOff * 0.85);
      vec3 steamTint = mix(vec3(1.0, 0.98, 0.95), vec3(0.92, 0.95, 0.98), uDarkMode);
      col = mix(col, steamTint, steamMask * steamActive * mix(0.20, 0.28, uDarkMode));
    }

    // ------------------------------------------------------------------------
    // DARK MODE: INTIMATE LATE-NIGHT SPECIALTY ESPRESSO BAR GRADE
    // ------------------------------------------------------------------------
    if (uDarkMode > 0.001) {
      float sat = max(max(col.r, col.g), col.b) - min(min(col.r, col.g), col.b);
      vec3 obsidianBase = vec3(0.043, 0.037, 0.034);
      vec3 moodyPhoto = pow(max(col, 0.0), vec3(1.85, 1.80, 1.72)) * 0.58;
      float subjectPop = smoothstep(0.10, 0.40, sat);
      moodyPhoto = mix(moodyPhoto, col * vec3(0.84, 0.76, 0.68), subjectPop * 0.62);
      float darkLeftCorridor =
        smoothstep(0.60, 0.18, uv.x) * (1.0 - portrait) * 0.68 +
        smoothstep(0.68, 0.585, uv.y) * portrait * 0.98;
      vec3 darkFinal = mix(moodyPhoto, obsidianBase, clamp(0.22 + (1.0 - subjectPop) * 0.16 + darkLeftCorridor, 0.0, 0.98));
      col = mix(col, darkFinal, uDarkMode);
    } else {
      // Light Mode: silky sunlit linen veil on left desktop corridor (AAA legibility while keeping stone grain)
      // and clean full linen stage across lower 59% on mobile portrait (zero photo/text collision!)
      vec3 linenVeil = vec3(0.965, 0.945, 0.910);
      float desktopVeil = smoothstep(0.54, 0.16, uv.x) * (1.0 - portrait) * 0.62;
      float mobileStage = smoothstep(0.68, 0.585, uv.y) * portrait * 0.995;
      col = mix(col, linenVeil, clamp(desktopVeil + mobileStage, 0.0, 0.995));
    }

    // Subtle filmic grain (authentic medium-format analog softness)
    float grain = (hash(uv * uResolution + fract(uTime * 13.0)) - 0.5) * 0.014;
    col += grain;

    // Smooth reveal from matching warm linen / obsidian ground while textures upload
    vec3 fallbackGround = mix(vec3(0.965, 0.945, 0.910), vec3(0.043, 0.037, 0.034), uDarkMode);
    col = mix(fallbackGround, col, uLoadedMask);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function mountCoffeeCinemaEngine(
  container: HTMLElement,
  stateRef: { current: CoffeeCinemaInput },
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
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return () => {};
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, Math.max(window.innerHeight, 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Neutral 1x1 placeholder texture while high-res JPEGs decode
  const placeholderData = new Uint8Array([246, 241, 232, 255]);
  const placeholderTex = new THREE.DataTexture(placeholderData, 1, 1);
  placeholderTex.colorSpace = THREE.SRGBColorSpace;
  placeholderTex.needsUpdate = true;

  const loader = new THREE.TextureLoader();
  const urls = [
    "/art/scene-01-hero.jpg",
    "/art/scene-02-roast.jpg",
    "/art/scene-03-brew.jpg",
    "/art/scene-04-table.jpg",
  ];
  const textures: THREE.Texture[] = [
    placeholderTex,
    placeholderTex,
    placeholderTex,
    placeholderTex,
  ];
  let loadedCount = 0;
  let loadedMaskSmooth = 0;

  const uniforms: Record<string, THREE.IUniform> = {
    uTex0: { value: placeholderTex },
    uTex1: { value: placeholderTex },
    uTex2: { value: placeholderTex },
    uTex3: { value: placeholderTex },
    uResolution: {
      value: new THREE.Vector2(
        window.innerWidth * dpr,
        Math.max(window.innerHeight, 1) * dpr,
      ),
    },
    uTexAspect: { value: 1600 / 893 },
    uTime: { value: 0 },
    uScroll: { value: stateRef.current.scrollProgress },
    uDarkMode: { value: stateRef.current.appearance === "dark" ? 1 : 0 },
    uCursor: { value: new THREE.Vector2(0.68, 0.5) },
    uCursorEnergy: { value: 0 },
    uRoastLevel: { value: 0.55 },
    uRoastConfirm: { value: 0 },
    uBrewActive: { value: 1 },
    uBoundary: { value: 0 },
    uPartnerFocus: { value: 0 },
    uCharge: { value: 0 },
    uRippleTime: { value: 5.0 },
    uRippleStrength: { value: 0 },
    uRippleCenter: { value: new THREE.Vector2(0.71, 0.5) },
    uLoadedMask: { value: 0 },
  };

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMat = new THREE.ShaderMaterial({
    vertexShader: CINEMA_VERTEX,
    fragmentShader: CINEMA_FRAGMENT,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(quadGeo, quadMat);
  scene.add(quad);

  let disposed = false;

  urls.forEach((url, idx) => {
    loader.load(url, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      textures[idx] = tex;
      uniforms[`uTex${idx}`]!.value = tex;
      quadMat.needsUpdate = true;
      loadedCount++;
      if (idx === 0 && loadedMaskSmooth < 1) {
        loadedMaskSmooth = 1;
        uniforms.uLoadedMask!.value = 1;
      }
      renderer.render(scene, camera);
    });
  });

  // Smooth interactive physics state
  const ptr = { x: 0.68, y: 0.5, tx: 0.68, ty: 0.5 };
  let cursorEnergy = 0;
  let scrollSmooth = stateRef.current.scrollProgress;
  let darkSmooth = stateRef.current.appearance === "dark" ? 1 : 0;
  let roastSmooth =
    stateRef.current.roastMode === "decaf"
      ? 0
      : stateRef.current.roastMode === "craft"
        ? 1
        : 0.55;
  let confirmSmooth = stateRef.current.roastConfirmed ? 1 : 0;
  let brewSmooth = stateRef.current.brewActive ? 1 : 0;
  let boundarySmooth = stateRef.current.boundaryTriggered ? 1 : 0;
  let partnerSmooth =
    stateRef.current.chatPartner === "david"
      ? 1
      : stateRef.current.chatPartner === "both"
        ? 0.5
        : 0;

  let pointerHolding = false;
  let wasHolding = false;
  let charge = 0;
  let rippleTime = 5.0;
  let rippleStrength = 0;
  let lastRippleNonce = stateRef.current.rippleNonce;
  let lastReportedAct = 0;
  let contextLost = false;

  const triggerRippleAt = (cx: number, cy: number, strength = 1.0) => {
    rippleTime = 0;
    rippleStrength = strength;
    (uniforms.uRippleCenter!.value as THREE.Vector2).set(cx, cy);
  };

  const getActiveFocalPoint = (): [number, number] => {
    const isPortrait = window.innerWidth / Math.max(window.innerHeight, 1) < 0.95;
    if (isPortrait) return [0.5, 0.7];
    if (lastReportedAct === 3) {
      return stateRef.current.chatPartner === "david"
        ? [0.82, 0.5]
        : [0.59, 0.5];
    }
    return [0.71, 0.5];
  };

  const onPointerMove = (e: PointerEvent) => {
    const nx = e.clientX / Math.max(window.innerWidth, 1);
    const ny = 1 - e.clientY / Math.max(window.innerHeight, 1);
    const speed = Math.hypot(nx - ptr.tx, ny - ptr.ty);
    ptr.tx = nx;
    ptr.ty = ny;
    cursorEnergy = Math.min(1, cursorEnergy + speed * 5.2);
  };

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest(
        "a, button, input, textarea, select, [role='radio'], [role='tab'], header, nav",
      )
    ) {
      return;
    }
    pointerHolding = true;
    const nx = e.clientX / Math.max(window.innerWidth, 1);
    const ny = 1 - e.clientY / Math.max(window.innerHeight, 1);
    triggerRippleAt(nx, ny, 0.85);
  };

  const onPointerUp = () => {
    pointerHolding = false;
  };

  const onResize = () => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, 1);
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(nextDpr);
    renderer.setSize(w, h);
    (uniforms.uResolution!.value as THREE.Vector2).set(
      w * nextDpr,
      h * nextDpr,
    );
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

  let rafId = 0;
  const startNow = performance.now();
  let prevNow = startNow;

  const animate = (now: number) => {
    if (contextLost || disposed) return;
    rafId = requestAnimationFrame(animate);
    if (document.hidden) {
      prevNow = now;
      return;
    }

    const dt = Math.min((now - prevNow) * 0.001, 0.05);
    prevNow = now;
    const t = reducedMotion ? 0 : (now - startNow) * 0.001;
    const st = stateRef.current;

    if (st.rippleNonce !== lastRippleNonce) {
      lastRippleNonce = st.rippleNonce;
      const [fx, fy] = getActiveFocalPoint();
      triggerRippleAt(fx, fy, 1.0);
    }

    const lerpRate = reducedMotion ? 1 : 0.085;
    scrollSmooth += (st.scrollProgress - scrollSmooth) * lerpRate;
    darkSmooth += ((st.appearance === "dark" ? 1 : 0) - darkSmooth) * 0.1;

    const targetRoast =
      st.roastMode === "decaf" ? 0 : st.roastMode === "craft" ? 1 : 0.55;
    roastSmooth += (targetRoast - roastSmooth) * 0.1;
    confirmSmooth += ((st.roastConfirmed ? 1 : 0) - confirmSmooth) * 0.1;
    brewSmooth += ((st.brewActive ? 1 : 0) - brewSmooth) * 0.1;
    boundarySmooth += ((st.boundaryTriggered ? 1 : 0) - boundarySmooth) * 0.1;
    const targetPartner =
      st.chatPartner === "david" ? 1 : st.chatPartner === "both" ? 0.5 : 0;
    partnerSmooth += (targetPartner - partnerSmooth) * 0.09;

    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ptr.y += (ptr.ty - ptr.y) * 0.08;
    cursorEnergy = Math.max(0, cursorEnergy - dt * 2.2);

    const isHoldingNow = !reducedMotion && (pointerHolding || st.holding);
    if (isHoldingNow) {
      charge = Math.min(1, charge + dt * 1.4);
    } else {
      if (wasHolding && charge > 0.14) {
        const [fx, fy] = getActiveFocalPoint();
        triggerRippleAt(fx, fy, 1.3);
        callbacks?.onHoldBurst?.();
      }
      charge = Math.max(0, charge - dt * 2.1);
    }
    wasHolding = isHoldingNow;
    document.documentElement.style.setProperty(
      "--cc-hold-charge",
      charge.toFixed(3),
    );

    rippleTime += dt;
    rippleStrength = Math.max(0, rippleStrength - dt * 0.55);

    if (loadedCount > 0) {
      loadedMaskSmooth = Math.min(1, loadedMaskSmooth + dt * 3.5);
    }

    const actIdx =
      scrollSmooth < 0.18
        ? 0
        : scrollSmooth < 0.42
          ? 1
          : scrollSmooth < 0.66
            ? 2
            : scrollSmooth < 0.88
              ? 3
              : 4;
    if (actIdx !== lastReportedAct) {
      lastReportedAct = actIdx;
      callbacks?.onActChange?.(actIdx);
    }

    uniforms.uTime!.value = t;
    uniforms.uScroll!.value = scrollSmooth;
    uniforms.uDarkMode!.value = darkSmooth;
    (uniforms.uCursor!.value as THREE.Vector2).set(ptr.x, ptr.y);
    uniforms.uCursorEnergy!.value = reducedMotion ? 0 : cursorEnergy;
    uniforms.uRoastLevel!.value = roastSmooth;
    uniforms.uRoastConfirm!.value = confirmSmooth;
    uniforms.uBrewActive!.value = brewSmooth;
    uniforms.uBoundary!.value = boundarySmooth;
    uniforms.uPartnerFocus!.value = partnerSmooth;
    uniforms.uCharge!.value = reducedMotion ? 0 : charge;
    uniforms.uRippleTime!.value = rippleTime;
    uniforms.uRippleStrength!.value = reducedMotion ? 0 : rippleStrength;
    uniforms.uLoadedMask!.value = loadedMaskSmooth;

    renderer.render(scene, camera);
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);

    quadGeo.dispose();
    quadMat.dispose();
    placeholderTex.dispose();
    for (const tex of textures) {
      if (tex !== placeholderTex) tex.dispose();
    }
    renderer.dispose();
    if (canvas.parentElement === container) {
      container.removeChild(canvas);
    }
  };
}
