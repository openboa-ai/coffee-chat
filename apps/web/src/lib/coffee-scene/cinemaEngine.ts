import * as THREE from "three";

export type StageChatPartner = "claire" | "david" | "both";

export interface CoffeeCinemaInput {
  scrollProgress: number; // 0..1 continuous across 5 cuts
  appearance: "light" | "dark";
  roastConfirmed: boolean;
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

  uniform sampler2D uTex0; // Cut 01 & 05: 75deg Hero Espresso
  uniform sampler2D uTex1; // Cut 02: 5deg Table-Level 100mm Macro Single Bean
  uniform sampler2D uTex2; // Cut 03: 45deg Mid-Air Gooseneck Kettle Pour
  uniform sampler2D uTex3; // Cut 04: 90deg Wide Architectural Overhead Two-Cup Table

  uniform vec2 uResolution;      // Container pixel size (right 54% pane or mobile top stage)
  uniform float uTexAspect;
  uniform float uTime;           // Dilated simulation time (freezes on Boundary trigger!)
  uniform float uRealTime;       // Wall-clock time
  uniform float uScroll;         // 0..1 smooth scroll progress
  uniform float uDarkMode;       // 0 = sunlit studio, 1 = late-night espresso bar
  uniform vec2 uCursor;          // 0..1 normalized cursor inside cinema pane
  uniform float uCursorEnergy;   // 0..1 pointer motion energy

  // 6-DOF Motion-Control Robot-Arm Camera Rig Uniforms
  uniform vec2 uCamPan;
  uniform float uCamZoom;
  uniform float uCamRoll;
  uniform vec2 uCamTilt;
  uniform vec2 uWhipVel;
  uniform float uZoomVel;
  uniform float uFocusBlur;
  uniform float uWhipEnergy;

  // Story State Uniforms
  uniform float uRoastConfirm;   // 0..1 Cut 02 confirmed bean punch & ember glow
  uniform float uBoundary;       // 0..1 Cut 03 Boundary shutter freeze & slice
  uniform float uPartnerFocus;   // 0 = @claire, 0.5 = both, 1 = @david
  uniform float uCharge;         // 0..1 hold-to-pour lens pull
  uniform float uRippleTime;     // seconds since last click/drop ripple
  uniform float uRippleStrength; // 0..1.35 ripple amplitude
  uniform vec2 uRippleCenter;    // 0..1 pane focal center
  uniform float uLoadedMask;     // 0..1 reveal once hero texture ready

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

  vec3 adjustSaturation(vec3 col, float sat) {
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), col, sat);
  }

  // Apply 3D projective pitch/yaw keystone + Dutch roll + cinema lens barrel breath
  vec2 applyCameraLens(vec2 uv, float roll, vec2 tilt, float barrel) {
    float paneAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = uv - vec2(0.5);

    float r2 = dot(p, p);
    p *= 1.0 + barrel * r2;

    float ca = cos(roll);
    float sa = sin(roll);
    vec2 pa = vec2(p.x * paneAspect, p.y);
    pa = vec2(pa.x * ca - pa.y * sa, pa.x * sa + pa.y * ca);
    p = vec2(pa.x / paneAspect, pa.y);

    float denom = max(0.74, 1.0 + (p.x * tilt.x + p.y * tilt.y));
    p /= denom;

    return p + vec2(0.5);
  }

  // Mathematically zero-clamp container-aware subject framing at ANY aspect ratio!
  vec2 computeStageUv(vec2 uv, float zoom, vec2 focalCenter) {
    float paneAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 halfSpan = vec2(0.5);
    if (paneAspect > uTexAspect) {
      halfSpan.y = 0.5 * (uTexAspect / paneAspect);
    } else {
      halfSpan.x = 0.5 * (paneAspect / uTexAspect);
    }
    halfSpan /= max(zoom, 1.01);
    vec2 safeCenter = clamp(focalCenter, halfSpan + 0.004, vec2(0.996) - halfSpan);
    return clamp(safeCenter + (uv - vec2(0.5)) * 2.0 * halfSpan, 0.004, 0.996);
  }

  vec3 sampleCutWorld(
    vec2 suv,
    float m01, float m12, float m23, float m34,
    float t01, float t12, float t23, float t34,
    vec2 parallax
  ) {
    float diveOut0  = t01 * (1.0 - m01);
    float diveIn1   = (1.0 - t01) * m01;
    float whipOut1  = t12 * (1.0 - m12);
    float whipIn2   = (1.0 - t12) * m12;
    float craneOut2 = t23 * (1.0 - m23);
    float craneIn3  = (1.0 - t23) * m23;

    // Cut 01 (75deg Hero Cup centered squarely inside right cinema pane)
    float z0 = uCamZoom + diveOut0 * 0.24;
    vec2 c0 = vec2(0.725, 0.50) + uCamPan + parallax + vec2(0.0, -diveOut0 * 0.09);

    // Cut 02 (5deg Table-Level 100mm Macro Single Bean centered cleanly)
    float z1 = uCamZoom + 0.03 + uRoastConfirm * 0.14 + whipOut1 * 0.14;
    vec2 c1 = vec2(0.70, 0.43) + uCamPan + parallax * 1.1 +
      vec2(whipOut1 * 0.10, diveIn1 * 0.09 - uRoastConfirm * 0.025 + whipOut1 * 0.05);

    // Cut 03 (45deg Gooseneck Kettle Pour tracking smoothly downward along the falling stream)
    float act3Local = clamp((uScroll - 0.44) / 0.24, 0.0, 1.0);
    float pourTrackY = mix(0.035, -0.030, act3Local);
    float z2 = uCamZoom + 0.02 - craneOut2 * 0.06;
    vec2 c2 = vec2(0.72, 0.50) + uCamPan + parallax +
      vec2(-whipIn2 * 0.09, pourTrackY - whipIn2 * 0.04 + craneOut2 * 0.06);

    // Cut 04 (90deg Wide Two-Cup Table: both cups centered at x=0.65, lateral dolly on @claire / @david)
    float tableShiftX = (uPartnerFocus - 0.5) * 0.16;
    float tableZoomBoost = abs(uPartnerFocus - 0.5) * 0.12;
    float z3 = max(1.01, (uCamZoom - 0.03) + tableZoomBoost + craneIn3 * 0.05);
    vec2 c3 = vec2(0.652 + tableShiftX, 0.50) + uCamPan + parallax + vec2(0.0, -craneIn3 * 0.04);

    // Cut 05 (Calm Crane Pull-Back Hero Espresso)
    float z4 = max(1.01, uCamZoom - 0.01);
    vec2 c4 = vec2(0.725, 0.50) + uCamPan + parallax;

    vec3 col = vec3(0.0);
    if (m01 < 0.999) {
      col = texture2D(uTex0, computeStageUv(suv, z0, c0)).rgb;
    }
    if (m01 > 0.001 && m12 < 0.999) {
      vec3 c1Col = texture2D(uTex1, computeStageUv(suv, z1, c1)).rgb;
      col = m01 >= 0.999 ? c1Col : mix(col, c1Col, m01);
    }
    if (m12 > 0.001 && m23 < 0.999) {
      vec3 c2Col = texture2D(uTex2, computeStageUv(suv, z2, c2)).rgb;
      col = m12 >= 0.999 ? c2Col : mix(col, c2Col, m12);
    }
    if (m23 > 0.001 && m34 < 0.999) {
      vec3 c3Col = texture2D(uTex3, computeStageUv(suv, z3, c3)).rgb;
      col = m23 >= 0.999 ? c3Col : mix(col, c3Col, m23);
    }
    if (m34 > 0.001) {
      vec3 c4Col = texture2D(uTex0, computeStageUv(suv, z4, c4)).rgb;
      col = m34 >= 0.999 ? c4Col : mix(col, c4Col, m34);
    }
    return col;
  }

  void main() {
    vec2 uv = vUv;
    float paneAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 aspectVec = vec2(paneAspect, 1.0);

    // Snappy S-curve beat cut windows matching the 5 left-column story beats
    float s = uScroll;
    float t01 = smoothstep(0.155, 0.255, s);
    float t12 = smoothstep(0.395, 0.495, s);
    float t23 = smoothstep(0.635, 0.735, s);
    float t34 = smoothstep(0.865, 0.955, s);

    float wAct1 = (1.0 - t01);
    float wAct2 = t01 * (1.0 - t12);
    float wAct3 = t12 * (1.0 - t23);
    float wAct4 = t23 * (1.0 - t34);
    float wAct5 = t34;

    vec2 parallax = (uCursor - 0.5) * vec2(-0.014, -0.010);

    // Expanding liquid ripple from click / state trigger
    vec2 dRip = (uv - uRippleCenter) * aspectVec;
    float ripDist = length(dRip);
    float waveFront = uRippleTime * 0.84;
    float ripEnv = exp(-pow((ripDist - waveFront) * 9.5, 2.0)) * exp(-uRippleTime * 1.45) * uRippleStrength;
    float ripWave = sin((ripDist - waveFront) * 44.0) * ripEnv;
    vec2 ripOffset = normalize(dRip + 0.0001) * ripWave * 0.012;

    // Gentle hover liquid refraction inside cinema pane
    vec2 dCur = (uv - uCursor) * aspectVec;
    float curDist = length(dCur);
    float curWave = sin(curDist * 28.0 - uTime * 4.5) * exp(-curDist * curDist * 26.0) * uCursorEnergy * 0.004;
    vec2 curOffset = normalize(dCur + 0.0001) * curWave;

    float fluidNoise = fbm(uv * 3.8 + vec2(uTime * 0.07, s * 3.0));
    float nMask = (fluidNoise - 0.5) * 0.14;
    float m01 = smoothstep(0.0, 1.0, clamp(t01 * 1.18 - 0.09 + nMask, 0.0, 1.0));
    float m12 = smoothstep(0.0, 1.0, clamp(t12 * 1.18 - 0.09 + nMask, 0.0, 1.0));
    float m23 = smoothstep(0.0, 1.0, clamp(t23 * 1.18 - 0.09 + nMask, 0.0, 1.0));
    float m34 = smoothstep(0.0, 1.0, clamp(t34 * 1.18 - 0.09 + nMask, 0.0, 1.0));

    float barrel = uWhipEnergy * 0.055 + uCharge * 0.04;
    vec2 lensUv = applyCameraLens(uv + ripOffset + curOffset, uCamRoll, uCamTilt, barrel);

    // 9-tap directional shutter motion blur + optical follow-focus bokeh
    vec2 radialVec = (lensUv - vec2(0.5)) * uZoomVel * 0.075;
    vec2 shutterVec = uWhipVel * 0.048 + radialVec;
    float blurMag = length(shutterVec) + uFocusBlur * 0.008;

    vec3 col;
    if (blurMag > 0.0012) {
      vec3 acc = vec3(0.0);
      float wSum = 0.0;
      for (int i = -4; i <= 4; i++) {
        float fi = float(i) / 4.0;
        float w = 1.0 - abs(fi) * 0.45;
        vec2 tapShift = shutterVec * fi;
        if (uFocusBlur > 0.01) {
          float ang = float(i) * 2.39996;
          tapShift += vec2(cos(ang), sin(ang)) * uFocusBlur * 0.0055 * (0.4 + 0.6 * abs(fi));
        }
        acc += sampleCutWorld(lensUv + tapShift, m01, m12, m23, m34, t01, t12, t23, t34, parallax) * w;
        wSum += w;
      }
      col = acc / wSum;

      // Subtle cinema RGB chromatic split strictly during fast robot-arm whips
      if (uWhipEnergy > 0.26) {
        float chromaAmt = (uWhipEnergy - 0.26) * 0.0042;
        vec2 chromaShift = normalize(shutterVec + vec2(0.0001)) * chromaAmt;
        vec3 colR = sampleCutWorld(lensUv + chromaShift, m01, m12, m23, m34, t01, t12, t23, t34, parallax);
        vec3 colB = sampleCutWorld(lensUv - chromaShift, m01, m12, m23, m34, t01, t12, t23, t34, parallax);
        col = vec3(mix(col.r, colR.r, 0.55), col.g, mix(col.b, colB.b, 0.55));
      }
    } else {
      col = sampleCutWorld(lensUv, m01, m12, m23, m34, t01, t12, t23, t34, parallax);
    }

    // ------------------------------------------------------------------------
    // STORY-DRIVEN PHOTOGRAPHIC GRADING PER CUT
    // ------------------------------------------------------------------------

    // Cut 01: Desaturated, cool "No standard plugged in" generic decaf feel (blooms warm as you scroll to Cut 02 or Cut 05!)
    float cut1Cool = wAct1 * (1.0 - smoothstep(0.03, 0.16, s));
    col = adjustSaturation(col, 1.0 - cut1Cool * 0.66 + wAct5 * 0.10);
    col = mix(col, col * vec3(0.95, 0.96, 1.0) + 0.04, cut1Cool * 0.58);

    // Cut 02: Confirm & keep Bean lights warm golden rim highlight on the single roasted bean
    if (wAct2 > 0.01) {
      float beanSpot = exp(-dot((uv - vec2(0.50, 0.44)) * aspectVec * 2.8, (uv - vec2(0.50, 0.44)) * aspectVec * 2.8));
      col = adjustSaturation(col, 1.0 + wAct2 * (uRoastConfirm * 0.24 - 0.05));
      col += vec3(0.98, 0.70, 0.30) * beanSpot * wAct2 * uRoastConfirm * 0.11;
    }

    // Cut 03: Live amber pour packets + High-Speed 1/4000s Boundary Freeze Slice right across the mid-air pour!
    if (wAct3 > 0.01) {
      vec2 pourTop = vec2(0.56, 0.76);
      vec2 pourBot = vec2(0.49, 0.46);
      vec2 pa = uv - pourTop;
      vec2 ba = pourBot - pourTop;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
      float distStream = length((pa - ba * h) * aspectVec);
      float streamMask = exp(-distStream * distStream * 1200.0) * smoothstep(0.0, 0.1, h) * smoothstep(1.0, 0.9, h);

      float belowGate = smoothstep(0.48, 0.54, h) * uBoundary;
      float pulseFlow = pow(0.5 + 0.5 * sin(h * 24.0 - uTime * 9.5), 3.0);
      col += vec3(1.0, 0.72, 0.28) * streamMask * pulseFlow * wAct3 * (1.0 - belowGate) * 0.28;

      // Crisp terracotta optical boundary freeze line straight across the falling stream
      float gateLine = exp(-pow((uv.y - 0.60) * 150.0, 2.0)) * exp(-pow((uv.x - 0.52) * 3.8, 2.0));
      float gatePulse = 0.78 + 0.22 * sin(uRealTime * 5.0);
      col += vec3(0.88, 0.33, 0.20) * gateLine * wAct3 * uBoundary * gatePulse * 0.62;
      col = mix(col, col * vec3(1.03, 0.93, 0.89), smoothstep(0.28, 0.76, length((uv - 0.5) * aspectVec)) * wAct3 * uBoundary * 0.48);
    }

    // Cut 04: Dual-Cup spotlight glide (@claire left cup vs @david right cup vs Compare both)
    if (wAct4 > 0.01) {
      vec2 clairePos = vec2(0.28 - (uPartnerFocus - 0.5) * 0.14, 0.50);
      vec2 davidPos  = vec2(0.73 - (uPartnerFocus - 0.5) * 0.14, 0.50);
      float nearClaire = exp(-dot((uv - clairePos) * aspectVec * 2.4, (uv - clairePos) * aspectVec * 2.4));
      float nearDavid  = exp(-dot((uv - davidPos) * aspectVec * 2.4, (uv - davidPos) * aspectVec * 2.4));

      float focusClaire = max(0.0, 1.0 - uPartnerFocus * 2.0);
      float focusDavid  = max(0.0, (uPartnerFocus - 0.5) * 2.0);

      col *= 1.0 - (focusClaire * nearDavid * 0.28 + focusDavid * nearClaire * 0.28) * wAct4;
      col += vec3(0.98, 0.82, 0.58) * nearClaire * focusClaire * wAct4 * 0.06;
      col += vec3(0.28, 0.62, 0.86) * nearDavid * focusDavid * wAct4 * 0.07;
    }

    // Specular glint on ripple crest
    col += vec3(1.0, 0.96, 0.90) * max(0.0, ripWave) * 0.24;

    // Volumetric curling steam (freezes smoothly on Boundary trigger!)
    vec2 steamOrigin = mix(vec2(0.50, 0.52), vec2(0.49, 0.56), wAct3);
    vec2 stUv = (uv - steamOrigin) * vec2(3.2, 1.9);
    if (stUv.y > -0.15 && stUv.y < 1.15 && abs(stUv.x) < 1.2) {
      float curlX = stUv.x + sin(stUv.y * 4.2 - uTime * 1.1) * 0.16 - (uCursor.x - 0.5) * stUv.y * 0.22;
      float steamN = fbm(vec2(curlX * 2.2, stUv.y * 2.4 - uTime * 0.34));
      float steamMask = smoothstep(-0.08, 0.25, stUv.y) * smoothstep(1.05, 0.25, stUv.y) *
        exp(-curlX * curlX * 4.5) * smoothstep(0.38, 0.78, steamN);
      float steamActive = (1.0 - cut1Cool * 0.85) * (1.0 - wAct2 * 0.95);
      vec3 steamTint = mix(vec3(1.0, 0.98, 0.95), vec3(0.92, 0.95, 0.98), uDarkMode);
      col = mix(col, steamTint, steamMask * steamActive * mix(0.20, 0.28, uDarkMode));
    }

    // Gentle optical cinema lens vignette
    float vigDist = length((uv - 0.5) * vec2(1.12, 1.0));
    col *= 1.0 - smoothstep(0.44, 0.98, vigDist) * (0.05 + uWhipEnergy * 0.14);

    // Dark Mode: intimate late-night specialty espresso bar grade (NO left corridor fog needed!)
    if (uDarkMode > 0.001) {
      float sat = max(max(col.r, col.g), col.b) - min(min(col.r, col.g), col.b);
      vec3 obsidianBase = vec3(0.045, 0.042, 0.042);
      vec3 moodyPhoto = pow(max(col, 0.0), vec3(1.65, 1.60, 1.54)) * 0.68;
      float subjectPop = smoothstep(0.10, 0.40, sat);
      moodyPhoto = mix(moodyPhoto, col * vec3(0.88, 0.80, 0.72), subjectPop * 0.65);
      vec3 darkFinal = mix(moodyPhoto, obsidianBase, clamp(0.16 + (1.0 - subjectPop) * 0.14, 0.0, 0.78));
      col = mix(col, darkFinal, uDarkMode);
    }

    float grain = (hash(uv * uResolution + fract(uRealTime * 13.0)) - 0.5) * 0.012;
    col += grain;

    vec3 fallbackGround = mix(vec3(0.955, 0.945, 0.925), vec3(0.045, 0.045, 0.052), uDarkMode);
    col = mix(fallbackGround, col, uLoadedMask);

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface SpringState {
  val: number;
  vel: number;
}

function stepSpring(
  s: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
) {
  const force = (target - s.val) * stiffness - s.vel * damping;
  s.vel += force * dt;
  s.val += s.vel * dt;
}

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

  const measure = () => ({
    w: Math.max(container.clientWidth || window.innerWidth, 1),
    h: Math.max(container.clientHeight || window.innerHeight, 1),
  });

  const initial = measure();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(initial.w, initial.h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const placeholderData = new Uint8Array([244, 241, 236, 255]);
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
    uResolution: { value: new THREE.Vector2(initial.w * dpr, initial.h * dpr) },
    uTexAspect: { value: 1600 / 893 },
    uTime: { value: 0 },
    uRealTime: { value: 0 },
    uScroll: { value: stateRef.current.scrollProgress },
    uDarkMode: { value: stateRef.current.appearance === "dark" ? 1 : 0 },
    uCursor: { value: new THREE.Vector2(0.5, 0.5) },
    uCursorEnergy: { value: 0 },
    uCamPan: { value: new THREE.Vector2(0, 0) },
    uCamZoom: { value: 1.04 },
    uCamRoll: { value: 0 },
    uCamTilt: { value: new THREE.Vector2(0, 0) },
    uWhipVel: { value: new THREE.Vector2(0, 0) },
    uZoomVel: { value: 0 },
    uFocusBlur: { value: 0 },
    uWhipEnergy: { value: 0 },
    uRoastConfirm: { value: 0 },
    uBoundary: { value: 0 },
    uPartnerFocus: { value: 0 },
    uCharge: { value: 0 },
    uRippleTime: { value: 5.0 },
    uRippleStrength: { value: 0 },
    uRippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
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

  // 6-DOF Robot-Arm Spring States
  const scrollSpring: SpringState = {
    val: stateRef.current.scrollProgress,
    vel: 0,
  };
  const zoomSpring: SpringState = { val: 1.04, vel: 0 };
  const panXSpring: SpringState = { val: 0, vel: 0 };
  const panYSpring: SpringState = { val: 0, vel: 0 };
  const rollSpring: SpringState = { val: 0, vel: 0 };
  const pitchSpring: SpringState = { val: 0, vel: 0 };
  const yawSpring: SpringState = { val: 0, vel: 0 };
  const partnerSpring: SpringState = {
    val:
      stateRef.current.chatPartner === "david"
        ? 1
        : stateRef.current.chatPartner === "both"
          ? 0.5
          : 0,
    vel: 0,
  };

  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let cursorEnergy = 0;
  let darkSmooth = stateRef.current.appearance === "dark" ? 1 : 0;
  let confirmSmooth = stateRef.current.roastConfirmed ? 1 : 0;
  let boundarySmooth = stateRef.current.boundaryTriggered ? 1 : 0;

  let focusImpulse = 0;
  let kickZoom = 0;
  let kickRoll = 0;
  let prevConfirmed = stateRef.current.roastConfirmed;
  let prevBoundary = stateRef.current.boundaryTriggered;
  let prevPartner = stateRef.current.chatPartner;

  let simTime = 0;
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

  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
    const speed = Math.hypot(nx - ptr.tx, ny - ptr.ty);
    ptr.tx = nx;
    ptr.ty = ny;
    cursorEnergy = Math.min(1, cursorEnergy + speed * 4.5);
  };

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest("a, button, input, textarea, select")) return;
    const rect = container.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }
    pointerHolding = true;
    const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
    const ny = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
    triggerRippleAt(nx, ny, 0.9);
  };

  const onPointerUp = () => {
    pointerHolding = false;
  };

  const syncSize = () => {
    const { w, h } = measure();
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(nextDpr);
    renderer.setSize(w, h, false);
    (uniforms.uResolution!.value as THREE.Vector2).set(w * nextDpr, h * nextDpr);
  };

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
  ro?.observe(container);

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
  window.addEventListener("resize", syncSize);
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
    const realT = reducedMotion ? 0 : (now - startNow) * 0.001;
    const st = stateRef.current;

    if (st.roastConfirmed !== prevConfirmed) {
      prevConfirmed = st.roastConfirmed;
      if (!reducedMotion && st.roastConfirmed) {
        focusImpulse = 0.6;
        kickZoom = 0.11;
        kickRoll = -0.025;
      }
    }
    if (st.boundaryTriggered !== prevBoundary) {
      prevBoundary = st.boundaryTriggered;
      if (!reducedMotion) {
        focusImpulse = 0.45;
        kickZoom = st.boundaryTriggered ? 0.08 : -0.04;
        kickRoll = st.boundaryTriggered ? 0.03 : -0.015;
      }
    }
    if (st.chatPartner !== prevPartner) {
      const prevDir = prevPartner === "david" ? 1 : prevPartner === "both" ? 0.5 : 0;
      const nextDir = st.chatPartner === "david" ? 1 : st.chatPartner === "both" ? 0.5 : 0;
      prevPartner = st.chatPartner;
      if (!reducedMotion) {
        focusImpulse = 0.45;
        kickRoll = (nextDir - prevDir) * 0.036;
      }
    }

    if (st.rippleNonce !== lastRippleNonce) {
      lastRippleNonce = st.rippleNonce;
      triggerRippleAt(0.5, 0.5, 1.0);
    }

    // High-speed 1/4000s shutter time-dilation freeze when Boundary triggers in Cut 03!
    const inAct3 = scrollSpring.val > 0.42 && scrollSpring.val < 0.72;
    const timeScale = reducedMotion
      ? 0
      : inAct3 && st.boundaryTriggered
        ? 0.025
        : 1.0;
    simTime += dt * timeScale;

    if (reducedMotion) {
      scrollSpring.val = st.scrollProgress;
      scrollSpring.vel = 0;
    } else {
      stepSpring(scrollSpring, st.scrollProgress, 88, 17.5, dt);
    }
    const s = Math.min(1, Math.max(0, scrollSpring.val));
    const sVel = Math.max(-2.6, Math.min(2.6, scrollSpring.vel));

    const actIdx =
      s < 0.20 ? 0 : s < 0.44 ? 1 : s < 0.68 ? 2 : s < 0.89 ? 3 : 4;
    if (actIdx !== lastReportedAct) {
      lastReportedAct = actIdx;
      callbacks?.onActChange?.(actIdx);
      if (!reducedMotion) {
        focusImpulse = Math.max(focusImpulse, 0.52);
      }
    }

    darkSmooth += ((st.appearance === "dark" ? 1 : 0) - darkSmooth) * 0.12;
    confirmSmooth += ((st.roastConfirmed ? 1 : 0) - confirmSmooth) * 0.13;
    boundarySmooth += ((st.boundaryTriggered ? 1 : 0) - boundarySmooth) * 0.16;

    const targetPartner =
      st.chatPartner === "david" ? 1 : st.chatPartner === "both" ? 0.5 : 0;
    if (reducedMotion) {
      partnerSpring.val = targetPartner;
      partnerSpring.vel = 0;
    } else {
      stepSpring(partnerSpring, targetPartner, 72, 13.5, dt);
    }

    const isHoldingNow = !reducedMotion && (pointerHolding || st.holding);
    if (isHoldingNow) {
      charge = Math.min(1, charge + dt * 1.45);
    } else {
      if (wasHolding && charge > 0.14) {
        triggerRippleAt(0.5, 0.5, 1.3);
        focusImpulse = 0.45;
        kickZoom = -0.04;
        callbacks?.onHoldBurst?.();
      }
      charge = Math.max(0, charge - dt * 2.2);
    }
    wasHolding = isHoldingNow;

    const peak01 = Math.exp(-Math.pow((s - 0.205) / 0.048, 2));
    const peak12 = Math.exp(-Math.pow((s - 0.445) / 0.048, 2));
    const peak23 = Math.exp(-Math.pow((s - 0.685) / 0.048, 2));
    const peak34 = Math.exp(-Math.pow((s - 0.910) / 0.045, 2));

    const targetZoomBase =
      1.04 + charge * 0.08 + peak01 * 0.10 + peak12 * 0.08 + kickZoom;

    const targetRoll = reducedMotion
      ? 0
      : peak01 * 0.068 * Math.sign(sVel || 1) -
        peak12 * 0.062 * Math.sign(sVel || 1) +
        peak23 * 0.078 * Math.sign(sVel || 1) -
        peak34 * 0.04 * Math.sign(sVel || 1) +
        partnerSpring.vel * 0.014 +
        kickRoll;

    const targetPitch = reducedMotion
      ? 0
      : peak01 * 0.26 - peak12 * 0.22 + peak23 * 0.20 + sVel * 0.08;
    const targetYaw = reducedMotion
      ? 0
      : peak12 * 0.24 - partnerSpring.vel * 0.08;

    const safeMinZoom =
      1.03 + Math.abs(rollSpring.val) * 0.72 + Math.abs(panXSpring.val) * 0.55;
    const targetZoom = Math.max(safeMinZoom, targetZoomBase);

    if (reducedMotion) {
      zoomSpring.val = 1.04;
      panXSpring.val = 0;
      panYSpring.val = 0;
      rollSpring.val = 0;
      pitchSpring.val = 0;
      yawSpring.val = 0;
    } else {
      stepSpring(zoomSpring, targetZoom, 95, 16, dt);
      stepSpring(panXSpring, 0, 85, 15, dt);
      stepSpring(panYSpring, Math.sin(realT * 0.42) * 0.004, 85, 15, dt);
      stepSpring(rollSpring, targetRoll, 95, 14.5, dt);
      stepSpring(pitchSpring, targetPitch, 85, 14, dt);
      stepSpring(yawSpring, targetYaw, 85, 14, dt);
    }

    kickZoom *= Math.exp(-dt * 9.5);
    kickRoll *= Math.exp(-dt * 10.0);
    focusImpulse *= Math.exp(-dt * 7.5);

    const whipX = reducedMotion
      ? 0
      : peak12 * sVel * 0.58 + partnerSpring.vel * 0.28 + panXSpring.vel * 0.4;
    const whipY = reducedMotion
      ? 0
      : peak01 * sVel * 0.65 + peak23 * sVel * 0.45 + panYSpring.vel * 0.4;
    const zoomVel = reducedMotion ? 0 : Math.max(-1.8, Math.min(1.8, zoomSpring.vel));

    const whipEnergy = reducedMotion
      ? 0
      : Math.min(
          1,
          Math.hypot(whipX, whipY) * 1.15 +
            Math.abs(zoomVel) * 0.35 +
            Math.abs(rollSpring.val) * 5.2,
        );
    const focusBlur = reducedMotion
      ? 0
      : Math.min(0.85, focusImpulse + whipEnergy * 0.28);

    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ptr.y += (ptr.ty - ptr.y) * 0.08;
    cursorEnergy = Math.max(0, cursorEnergy - dt * 2.2);

    rippleTime += dt;
    rippleStrength = Math.max(0, rippleStrength - dt * 0.55);

    if (loadedCount > 0) {
      loadedMaskSmooth = Math.min(1, loadedMaskSmooth + dt * 4.0);
    }

    uniforms.uTime!.value = simTime;
    uniforms.uRealTime!.value = realT;
    uniforms.uScroll!.value = s;
    uniforms.uDarkMode!.value = darkSmooth;
    (uniforms.uCursor!.value as THREE.Vector2).set(ptr.x, ptr.y);
    uniforms.uCursorEnergy!.value = reducedMotion ? 0 : cursorEnergy;
    (uniforms.uCamPan!.value as THREE.Vector2).set(panXSpring.val, panYSpring.val);
    uniforms.uCamZoom!.value = zoomSpring.val;
    uniforms.uCamRoll!.value = rollSpring.val;
    (uniforms.uCamTilt!.value as THREE.Vector2).set(yawSpring.val, pitchSpring.val);
    (uniforms.uWhipVel!.value as THREE.Vector2).set(whipX, whipY);
    uniforms.uZoomVel!.value = zoomVel;
    uniforms.uFocusBlur!.value = focusBlur;
    uniforms.uWhipEnergy!.value = whipEnergy;
    uniforms.uRoastConfirm!.value = confirmSmooth;
    uniforms.uBoundary!.value = boundarySmooth;
    uniforms.uPartnerFocus!.value = partnerSpring.val;
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
    ro?.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("resize", syncSize);
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
