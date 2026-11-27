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

  uniform sampler2D uTex0; // Cut 01 & 05: 75deg Overhead Hero Espresso
  uniform sampler2D uTex1; // Cut 02: 5deg Table-Level 100mm Macro Single Bean
  uniform sampler2D uTex2; // Cut 03: 45deg Mid-Air Gooseneck Pour Track
  uniform sampler2D uTex3; // Cut 04: 90deg Wide Architectural Overhead Two-Cup Table

  uniform vec2 uResolution;
  uniform float uTexAspect;
  uniform float uTime;           // Dilated simulation time (freezes on Boundary trigger!)
  uniform float uRealTime;       // Wall clock time for subtle UI micro-pulse
  uniform float uScroll;         // 0..1 smooth scroll progress
  uniform float uDarkMode;       // 0 = sunlit studio, 1 = late-night espresso bar
  uniform vec2 uCursor;          // 0..1 normalized viewport cursor
  uniform float uCursorEnergy;   // 0..1 pointer velocity impulse

  // 6-DOF Motion-Control Robot-Arm Camera Rig Uniforms
  uniform vec2 uCamPan;          // Spring-driven camera pan offset
  uniform float uCamZoom;        // Spring-driven camera focal zoom (>= 1.04)
  uniform float uCamRoll;        // Radians roll banking during whips
  uniform vec2 uCamTilt;         // Projective perspective pitch/yaw skew
  uniform vec2 uWhipVel;         // Screen-space directional whip velocity vector
  uniform float uZoomVel;        // Instantaneous radial crash-zoom velocity
  uniform float uFocusBlur;      // 0..1 optical follow-focus rack blur
  uniform float uWhipEnergy;     // 0..1 overall rig kinetic intensity

  // Story State Grading Uniforms
  uniform float uRoastLevel;     // 0 = decaf, 0.55 = growth, 1 = specialist
  uniform float uRoastConfirm;   // 0..1 confirmed bean macro punch & ember glow
  uniform float uBrewActive;     // 0..1 live pour active
  uniform float uBoundary;       // 0..1 Boundary Gate high-speed freeze & slice
  uniform float uPartnerFocus;   // 0 = @claire, 0.5 = both, 1 = @david
  uniform float uCharge;         // 0..1 hold-to-pour lens pull
  uniform float uRippleTime;     // seconds since last click/drop ripple
  uniform float uRippleStrength; // 0..1.4 ripple amplitude
  uniform vec2 uRippleCenter;    // 0..1 viewport focal center
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
  vec2 applyCameraLens(vec2 uv, float roll, vec2 tilt, float barrel, float portrait) {
    float screenAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = uv - vec2(0.5);

    // Subtle cinema barrel distortion during high-speed whips
    float r2 = dot(p, p);
    p *= 1.0 + barrel * r2;

    // Aspect-corrected roll rotation around viewport center
    float ca = cos(roll);
    float sa = sin(roll);
    vec2 pa = vec2(p.x * screenAspect, p.y);
    pa = vec2(pa.x * ca - pa.y * sa, pa.x * sa + pa.y * ca);
    p = vec2(pa.x / screenAspect, pa.y);

    // Projective 3D perspective keystone foreshortening (reduced on portrait)
    float tiltAmt = 1.0 - portrait * 0.75;
    float denom = max(0.72, 1.0 + (p.x * tilt.x + p.y * tilt.y) * tiltAmt);
    p /= denom;

    return p + vec2(0.5);
  }

  // Aspect-correct cover UV mapping with overscan protection & zero-clamp portrait showcase
  vec2 computeCoverUv(vec2 uv, float zoom, vec2 focalBias, float portrait) {
    float screenAspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 scale = vec2(1.0);
    if (screenAspect > uTexAspect) {
      scale.y = uTexAspect / screenAspect;
    } else {
      scale.x = screenAspect / uTexAspect;
    }

    vec2 desktopUv = (uv - vec2(0.5)) * scale / zoom + vec2(0.5) + focalBias;

    // Zero-clamp upper-40% mobile showcase framing
    vec2 portraitDelta = vec2(uv.x - 0.5, uv.y - 0.785);
    vec2 portraitScale = vec2(0.56, 0.56 / max(screenAspect / uTexAspect, 0.25));
    vec2 portraitUv = vec2(0.71, 0.50) + portraitDelta * portraitScale / max(zoom, 1.02) + focalBias * 0.28;

    return clamp(mix(desktopUv, portraitUv, portrait), 0.003, 0.997);
  }

  // Sample blended multi-cut studio world at a given transformed screen UV
  vec3 sampleCutWorld(
    vec2 suv,
    float m01, float m12, float m23, float m34,
    float t01, float t12, float t23, float t34,
    float portrait,
    vec2 parallax
  ) {
    // Per-cut robot-arm entry/exit momentum offsets so every cut feels physically connected
    float diveOut0 = t01 * (1.0 - m01);
    float diveIn1  = (1.0 - t01) * m01;
    float whipOut1 = t12 * (1.0 - m12);
    float whipIn2  = (1.0 - t12) * m12;
    float craneOut2 = t23 * (1.0 - m23);
    float craneIn3  = (1.0 - t23) * m23;

    // Cut 01 & 05 (Hero Espresso): crash-zoom dive out into Act 02
    float z0 = uCamZoom + diveOut0 * 0.24;
    vec2 b0 = uCamPan + parallax + vec2(0.0, -diveOut0 * 0.09);

    // Cut 02 (5deg Extreme Macro Bean): drops from above into razor-sharp bean, whips right-up into Act 03
    float z1 = uCamZoom + 0.015 + uRoastConfirm * 0.11 + whipOut1 * 0.14;
    vec2 b1 = uCamPan + parallax * 1.15 + vec2(whipOut1 * 0.11 + uRoastConfirm * 0.028, diveIn1 * 0.09 - uRoastConfirm * 0.022 + whipOut1 * 0.05);

    // Cut 03 (45deg Gooseneck Pour): tracks smoothly downward along the falling amber stream
    float act3Local = clamp((uScroll - 0.44) / 0.24, 0.0, 1.0);
    float pourTrackY = mix(0.026, -0.024, act3Local) * (1.0 - portrait * 0.8);
    float z2 = uCamZoom + 0.015 + uBrewActive * 0.025 - craneOut2 * 0.06;
    vec2 b2 = uCamPan + parallax + vec2(-whipIn2 * 0.10, pourTrackY - whipIn2 * 0.04 + craneOut2 * 0.06);

    // Cut 04 (90deg Wide Two-Cup Table): crisp robot-arm lateral slider keeping both cups clear of left text
    float tableShiftX = (uPartnerFocus - 0.5) * 0.048 * (1.0 - portrait * 0.8);
    float tableZoomBoost = abs(uPartnerFocus - 0.5) * 0.055 * (1.0 - portrait * 0.7);
    float z3 = uCamZoom + tableZoomBoost + craneIn3 * 0.05;
    vec2 b3 = uCamPan + parallax + vec2(tableShiftX, -craneIn3 * 0.04);

    vec3 col = vec3(0.0);
    if (m01 < 0.999) {
      col = texture2D(uTex0, computeCoverUv(suv, z0, b0, portrait)).rgb;
    }
    if (m01 > 0.001 && m12 < 0.999) {
      vec3 c1 = texture2D(uTex1, computeCoverUv(suv, z1, b1, portrait)).rgb;
      col = m01 >= 0.999 ? c1 : mix(col, c1, m01);
    }
    if (m12 > 0.001 && m23 < 0.999) {
      vec3 c2 = texture2D(uTex2, computeCoverUv(suv, z2, b2, portrait)).rgb;
      col = m12 >= 0.999 ? c2 : mix(col, c2, m12);
    }
    if (m23 > 0.001 && m34 < 0.999) {
      vec3 c3 = texture2D(uTex3, computeCoverUv(suv, z3, b3, portrait)).rgb;
      col = m23 >= 0.999 ? c3 : mix(col, c3, m23);
    }
    if (m34 > 0.001) {
      vec3 c4 = texture2D(uTex0, computeCoverUv(suv, uCamZoom + 0.01, uCamPan + parallax, portrait)).rgb;
      col = m34 >= 0.999 ? c4 : mix(col, c4, m34);
    }
    return col;
  }

  void main() {
    vec2 uv = vUv;
    float screenAspect = uResolution.x / max(uResolution.y, 1.0);
    float portrait = smoothstep(1.06, 0.72, screenAspect);

    // Tight, snappy S-curve beat cut windows (robot-arm speed-ramp feel!)
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

    // Gentle living parallax (halted slightly during Boundary freeze)
    vec2 parallax = (uCursor - 0.5) * vec2(-0.016, -0.012) * (1.0 - portrait * 0.65);

    // Liquid ripple from click / roast / hold-release
    vec2 aspectVec = vec2(screenAspect, 1.0);
    vec2 dRip = (uv - uRippleCenter) * aspectVec;
    float ripDist = length(dRip);
    float waveFront = uRippleTime * 0.82;
    float ripEnv = exp(-pow((ripDist - waveFront) * 9.5, 2.0)) * exp(-uRippleTime * 1.45) * uRippleStrength;
    float ripWave = sin((ripDist - waveFront) * 46.0) * ripEnv;
    vec2 ripOffset = normalize(dRip + 0.0001) * ripWave * 0.013;

    // Whisper-subtle pointer refraction on coffee surface
    vec2 dCur = (uv - uCursor) * aspectVec;
    float curDist = length(dCur);
    float curWave = sin(curDist * 28.0 - uTime * 4.5) * exp(-curDist * curDist * 28.0) * uCursorEnergy * 0.004;
    vec2 curOffset = normalize(dCur + 0.0001) * curWave;

    // Tighter directional whip mask (replaces sleepy slow fade!)
    float fluidNoise = fbm(uv * 3.8 + vec2(uTime * 0.07, s * 3.0));
    float nMask = (fluidNoise - 0.5) * 0.14;
    float m01 = smoothstep(0.0, 1.0, clamp(t01 * 1.18 - 0.09 + nMask, 0.0, 1.0));
    float m12 = smoothstep(0.0, 1.0, clamp(t12 * 1.18 - 0.09 + nMask, 0.0, 1.0));
    float m23 = smoothstep(0.0, 1.0, clamp(t23 * 1.18 - 0.09 + nMask, 0.0, 1.0));
    float m34 = smoothstep(0.0, 1.0, clamp(t34 * 1.18 - 0.09 + nMask, 0.0, 1.0));

    // Apply 3D robot-arm camera lens homography + Dutch roll + barrel breath
    float barrel = uWhipEnergy * 0.06 + uCharge * 0.045;
    vec2 lensUv = applyCameraLens(uv + ripOffset + curOffset, uCamRoll, uCamTilt, barrel, portrait);

    // ------------------------------------------------------------------------
    // TRUE 9-TAP DIRECTIONAL SHUTTER MOTION BLUR + OPTICAL RACK-FOCUS DOF
    // ------------------------------------------------------------------------
    vec2 radialVec = (lensUv - vec2(0.68, 0.50)) * uZoomVel * 0.075;
    vec2 shutterVec = (uWhipVel * 0.048 + radialVec) * (1.0 - portrait * 0.55);
    float blurMag = length(shutterVec) + uFocusBlur * 0.008;

    vec3 col;
    if (blurMag > 0.0012) {
      vec3 acc = vec3(0.0);
      float wSum = 0.0;
      for (int i = -4; i <= 4; i++) {
        float fi = float(i) / 4.0;
        float w = 1.0 - abs(fi) * 0.45;
        vec2 tapShift = shutterVec * fi;
        // Optical rack-focus micro bokeh ring mixed with directional whip streak
        if (uFocusBlur > 0.01) {
          float ang = float(i) * 2.39996;
          tapShift += vec2(cos(ang), sin(ang)) * uFocusBlur * 0.0055 * (0.4 + 0.6 * abs(fi));
        }
        acc += sampleCutWorld(lensUv + tapShift, m01, m12, m23, m34, t01, t12, t23, t34, portrait, parallax) * w;
        wSum += w;
      }
      col = acc / wSum;

      // Subtle optical cinema RGB chromatic edge split ONLY during true high-speed whips!
      if (uWhipEnergy > 0.26) {
        float chromaAmt = (uWhipEnergy - 0.26) * 0.0042;
        vec2 chromaShift = normalize(shutterVec + vec2(0.0001)) * chromaAmt;
        vec3 colR = sampleCutWorld(lensUv + chromaShift, m01, m12, m23, m34, t01, t12, t23, t34, portrait, parallax);
        vec3 colB = sampleCutWorld(lensUv - chromaShift, m01, m12, m23, m34, t01, t12, t23, t34, portrait, parallax);
        col = vec3(mix(col.r, colR.r, 0.55), col.g, mix(col.b, colB.b, 0.55));
      }
    } else {
      col = sampleCutWorld(lensUv, m01, m12, m23, m34, t01, t12, t23, t34, portrait, parallax);
    }

    // ------------------------------------------------------------------------
    // LIVE INTERACTIVE STORY GRADING PER CUT
    // ------------------------------------------------------------------------

    // Cut 01: No Bean (pale cool decaf) vs Growth Roast (warm sunlit crema) vs Specialist (rich deep ink)
    float decafFactor = (1.0 - smoothstep(0.0, 0.42, uRoastLevel)) * wAct1;
    float craftFactor = smoothstep(0.55, 1.0, uRoastLevel) * wAct1;
    col = adjustSaturation(col, 1.0 - decafFactor * 0.68 + (1.0 - decafFactor) * wAct1 * 0.08 + craftFactor * 0.14);
    col = mix(col, col * vec3(0.95, 0.96, 0.99) + 0.05, decafFactor * 0.65);
    col = mix(col, pow(max(col, 0.0), vec3(1.24, 1.15, 1.06)) * vec3(0.92, 0.97, 1.06), craftFactor * 0.62);

    // Cut 02: Confirm & Roast Bean lights warm golden rim highlight around the single macro bean
    if (wAct2 > 0.01) {
      vec2 beanPos = mix(vec2(0.70, 0.39), vec2(0.50, 0.76), portrait);
      float beanSpot = exp(-dot((uv - beanPos) * aspectVec * 3.4, (uv - beanPos) * aspectVec * 3.4));
      col = adjustSaturation(col, 1.0 + wAct2 * (uRoastConfirm * 0.22 - 0.06));
      col += vec3(0.98, 0.70, 0.30) * beanSpot * wAct2 * uRoastConfirm * 0.10;
    }

    // Cut 03: Brew ON/OFF + Traveling Pour Packets + Boundary Freeze Slice!
    float brewOff = (1.0 - uBrewActive) * wAct3;
    col = adjustSaturation(col, 1.0 - brewOff * 0.58 + uBrewActive * wAct3 * 0.10);
    if (wAct3 > 0.01) {
      vec2 pourTop = mix(vec2(0.755, 0.77), vec2(0.54, 0.86), portrait);
      vec2 pourBot = mix(vec2(0.705, 0.44), vec2(0.50, 0.68), portrait);
      vec2 pa = uv - pourTop;
      vec2 ba = pourBot - pourTop;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
      float distStream = length((pa - ba * h) * aspectVec);
      float streamMask = exp(-distStream * distStream * 1800.0) * smoothstep(0.0, 0.08, h) * smoothstep(1.0, 0.9, h);

      // Luminous Taste packets riding down the real photographed pour stream (stopped below gate on Boundary!)
      float belowGate = smoothstep(0.50, 0.56, h) * uBoundary;
      float pulseFlow = pow(0.5 + 0.5 * sin(h * 26.0 - uTime * 9.5), 3.0);
      col += vec3(1.0, 0.72, 0.28) * streamMask * pulseFlow * wAct3 * uBrewActive * (1.0 - belowGate) * 0.30;

      // Boundary Gate: sharp warm terracotta optical slice right across the mid-air pour stream!
      float gateY = mix(0.59, 0.76, portrait);
      float gateLine = exp(-pow((uv.y - gateY) * 140.0, 2.0)) * exp(-pow((uv.x - mix(0.72, 0.52, portrait)) * 7.5, 2.0));
      float gatePulse = 0.75 + 0.25 * sin(uRealTime * 5.0);
      col += vec3(0.86, 0.34, 0.22) * gateLine * wAct3 * uBoundary * gatePulse * 0.55;
      col = mix(col, col * vec3(1.04, 0.94, 0.90), smoothstep(0.25, 0.72, length((uv - vec2(0.70, 0.52)) * aspectVec)) * wAct3 * uBoundary * 0.45);
    }

    // Cut 04: Dual-Cup spotlight glide synced to wide two-cup table (claire x=0.543, david x=0.796)
    if (wAct4 > 0.01) {
      float shiftVis = -(uPartnerFocus - 0.5) * 0.048 * (1.0 - portrait * 0.8);
      vec2 claireCupUv = mix(vec2(0.543 + shiftVis, 0.50), vec2(0.32, 0.75), portrait);
      vec2 davidCupUv  = mix(vec2(0.796 + shiftVis, 0.50), vec2(0.70, 0.75), portrait);
      float nearClaire = exp(-dot((uv - claireCupUv) * aspectVec * 2.8, (uv - claireCupUv) * aspectVec * 2.8));
      float nearDavid  = exp(-dot((uv - davidCupUv) * aspectVec * 2.8, (uv - davidCupUv) * aspectVec * 2.8));

      float focusClaire = max(0.0, 1.0 - uPartnerFocus * 2.0);
      float focusDavid  = max(0.0, (uPartnerFocus - 0.5) * 2.0);

      col *= 1.0 - (focusClaire * nearDavid * 0.26 + focusDavid * nearClaire * 0.26) * wAct4;
      col += vec3(0.98, 0.82, 0.58) * nearClaire * focusClaire * wAct4 * 0.06;
      col += vec3(0.28, 0.62, 0.86) * nearDavid * focusDavid * wAct4 * 0.07;
    }

    // Specular liquid glint along expanding ripple crest
    col += vec3(1.0, 0.96, 0.90) * max(0.0, ripWave) * 0.25;

    // Volumetric curling steam (freezes smoothly during Boundary time-dilation!)
    vec2 steamOrigin = mix(
      mix(vec2(0.71, 0.54), vec2(0.69, 0.58), wAct3),
      vec2(0.50, 0.74),
      portrait
    );
    vec2 stUv = (uv - steamOrigin) * vec2(3.6, 1.9);
    if (stUv.y > -0.15 && stUv.y < 1.15 && abs(stUv.x) < 1.2) {
      float curlX = stUv.x + sin(stUv.y * 4.2 - uTime * 1.1) * 0.16 - (uCursor.x - 0.5) * stUv.y * 0.25;
      float steamN = fbm(vec2(curlX * 2.2, stUv.y * 2.4 - uTime * 0.34));
      float steamMask = smoothstep(-0.08, 0.25, stUv.y) * smoothstep(1.05, 0.25, stUv.y) *
        exp(-curlX * curlX * 4.5) * smoothstep(0.38, 0.78, steamN);
      float steamActive = (1.0 - decafFactor) * (1.0 - wAct2 * 0.95) * (1.0 - brewOff * 0.85);
      vec3 steamTint = mix(vec3(1.0, 0.98, 0.95), vec3(0.92, 0.95, 0.98), uDarkMode);
      col = mix(col, steamTint, steamMask * steamActive * mix(0.20, 0.28, uDarkMode));
    }

    // Subtle cinema lens vignette breathing during whip moves
    float vigDist = length((uv - 0.5) * vec2(1.15, 1.0));
    col *= 1.0 - smoothstep(0.45, 0.98, vigDist) * (0.04 + uWhipEnergy * 0.14);

    // ------------------------------------------------------------------------
    // DARK MODE (CANDLELIT ESPRESSO BAR) vs LIGHT MODE (AAA LEFT CORRIDOR + MOBILE STAGE)
    // ------------------------------------------------------------------------
    if (uDarkMode > 0.001) {
      float sat = max(max(col.r, col.g), col.b) - min(min(col.r, col.g), col.b);
      vec3 obsidianBase = vec3(0.043, 0.037, 0.034);
      vec3 moodyPhoto = pow(max(col, 0.0), vec3(1.85, 1.80, 1.72)) * 0.58;
      float subjectPop = smoothstep(0.10, 0.40, sat);
      moodyPhoto = mix(moodyPhoto, col * vec3(0.84, 0.76, 0.68), subjectPop * 0.62);
      float darkLeftCorridor =
        smoothstep(0.56, 0.18, uv.x) * (1.0 - portrait) * 0.70 +
        smoothstep(0.68, 0.585, uv.y) * portrait * 0.98;
      vec3 darkFinal = mix(moodyPhoto, obsidianBase, clamp(0.22 + (1.0 - subjectPop) * 0.16 + darkLeftCorridor, 0.0, 0.98));
      col = mix(col, darkFinal, uDarkMode);
    } else {
      vec3 linenVeil = vec3(0.965, 0.945, 0.910);
      float desktopVeil = smoothstep(0.50, 0.16, uv.x) * (1.0 - portrait) * 0.62;
      float mobileStage = smoothstep(0.68, 0.585, uv.y) * portrait * 0.995;
      col = mix(col, linenVeil, clamp(desktopVeil + mobileStage, 0.0, 0.995));
    }

    // Subtle analog film grain
    float grain = (hash(uv * uResolution + fract(uRealTime * 13.0)) - 0.5) * 0.013;
    col += grain;

    vec3 fallbackGround = mix(vec3(0.965, 0.945, 0.910), vec3(0.043, 0.037, 0.034), uDarkMode);
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
    uRealTime: { value: 0 },
    uScroll: { value: stateRef.current.scrollProgress },
    uDarkMode: { value: stateRef.current.appearance === "dark" ? 1 : 0 },
    uCursor: { value: new THREE.Vector2(0.68, 0.5) },
    uCursorEnergy: { value: 0 },
    uCamPan: { value: new THREE.Vector2(0, 0) },
    uCamZoom: { value: 1.05 },
    uCamRoll: { value: 0 },
    uCamTilt: { value: new THREE.Vector2(0, 0) },
    uWhipVel: { value: new THREE.Vector2(0, 0) },
    uZoomVel: { value: 0 },
    uFocusBlur: { value: 0 },
    uWhipEnergy: { value: 0 },
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

  // 6-DOF Robot-Arm Spring States (tight, snappy mechanical brake with subtle overshoot)
  const scrollSpring: SpringState = {
    val: stateRef.current.scrollProgress,
    vel: 0,
  };
  const zoomSpring: SpringState = { val: 1.07, vel: 0 };
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

  const ptr = { x: 0.68, y: 0.5, tx: 0.68, ty: 0.5 };
  let cursorEnergy = 0;
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

  // Optical impulse triggers (snap focus + kinetic kick on state changes!)
  let focusImpulse = 0;
  let kickZoom = 0;
  let kickRoll = 0;
  let prevRoastMode = stateRef.current.roastMode;
  let prevConfirmed = stateRef.current.roastConfirmed;
  let prevBoundary = stateRef.current.boundaryTriggered;
  let prevPartner = stateRef.current.chatPartner;
  let prevBrew = stateRef.current.brewActive;

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

  const getActiveFocalPoint = (): [number, number] => {
    const isPortrait = window.innerWidth / Math.max(window.innerHeight, 1) < 0.95;
    if (isPortrait) return [0.5, 0.74];
    if (lastReportedAct === 1) return [0.70, 0.39];
    if (lastReportedAct === 2) return [0.71, 0.52];
    if (lastReportedAct === 3) {
      return stateRef.current.chatPartner === "david"
        ? [0.75, 0.5]
        : stateRef.current.chatPartner === "both"
          ? [0.65, 0.5]
          : [0.55, 0.5];
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
    triggerRippleAt(nx, ny, 0.9);
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
  const rootStyle = document.documentElement.style;

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

    // Detect interactive beat snaps to fire crisp robot-arm mechanical kicks!
    if (st.roastMode !== prevRoastMode) {
      prevRoastMode = st.roastMode;
      if (!reducedMotion) {
        focusImpulse = 0.55;
        kickZoom = st.roastMode === "decaf" ? -0.04 : 0.07;
        kickRoll = st.roastMode === "craft" ? -0.022 : 0.018;
      }
    }
    if (st.roastConfirmed !== prevConfirmed) {
      prevConfirmed = st.roastConfirmed;
      if (!reducedMotion && st.roastConfirmed) {
        focusImpulse = 0.65;
        kickZoom = 0.11;
        kickRoll = -0.025;
      }
    }
    if (st.boundaryTriggered !== prevBoundary) {
      prevBoundary = st.boundaryTriggered;
      if (!reducedMotion) {
        focusImpulse = 0.45;
        kickZoom = st.boundaryTriggered ? 0.08 : -0.04;
        kickRoll = st.boundaryTriggered ? 0.032 : -0.015;
      }
    }
    if (st.brewActive !== prevBrew) {
      prevBrew = st.brewActive;
      if (!reducedMotion) {
        focusImpulse = 0.35;
      }
    }
    if (st.chatPartner !== prevPartner) {
      const prevDir = prevPartner === "david" ? 1 : prevPartner === "both" ? 0.5 : 0;
      const nextDir = st.chatPartner === "david" ? 1 : st.chatPartner === "both" ? 0.5 : 0;
      prevPartner = st.chatPartner;
      if (!reducedMotion) {
        focusImpulse = 0.5;
        kickRoll = (nextDir - prevDir) * 0.04;
      }
    }

    if (st.rippleNonce !== lastRippleNonce) {
      lastRippleNonce = st.rippleNonce;
      const [fx, fy] = getActiveFocalPoint();
      triggerRippleAt(fx, fy, 1.05);
    }

    // Time dilation: freeze steam & pour motion smoothly when Boundary Gate triggers in Act 03!
    const inAct3 = scrollSpring.val > 0.42 && scrollSpring.val < 0.72;
    const timeScale = reducedMotion
      ? 0
      : inAct3 && st.boundaryTriggered
        ? 0.04
        : 1.0;
    simTime += dt * timeScale;

    // 1. Scroll spring (tight mechanical tracking with real velocity derivative)
    if (reducedMotion) {
      scrollSpring.val = st.scrollProgress;
      scrollSpring.vel = 0;
    } else {
      stepSpring(scrollSpring, st.scrollProgress, 88, 17.5, dt);
    }
    const s = Math.min(1, Math.max(0, scrollSpring.val));
    const sVel = Math.max(-2.6, Math.min(2.6, scrollSpring.vel));

    // Identify active cut index
    const actIdx =
      s < 0.20 ? 0 : s < 0.44 ? 1 : s < 0.68 ? 2 : s < 0.89 ? 3 : 4;
    if (actIdx !== lastReportedAct) {
      lastReportedAct = actIdx;
      callbacks?.onActChange?.(actIdx);
      if (!reducedMotion) {
        focusImpulse = Math.max(focusImpulse, 0.55);
      }
    }

    // Smooth interactive grading targets
    darkSmooth += ((st.appearance === "dark" ? 1 : 0) - darkSmooth) * 0.12;
    const targetRoast =
      st.roastMode === "decaf" ? 0 : st.roastMode === "craft" ? 1 : 0.55;
    roastSmooth += (targetRoast - roastSmooth) * 0.13;
    confirmSmooth += ((st.roastConfirmed ? 1 : 0) - confirmSmooth) * 0.13;
    brewSmooth += ((st.brewActive ? 1 : 0) - brewSmooth) * 0.13;
    boundarySmooth += ((st.boundaryTriggered ? 1 : 0) - boundarySmooth) * 0.16;

    const targetPartner =
      st.chatPartner === "david" ? 1 : st.chatPartner === "both" ? 0.5 : 0;
    if (reducedMotion) {
      partnerSpring.val = targetPartner;
      partnerSpring.vel = 0;
    } else {
      stepSpring(partnerSpring, targetPartner, 72, 13.5, dt);
    }

    // Hold-to-pour optical charge
    const isHoldingNow = !reducedMotion && (pointerHolding || st.holding);
    if (isHoldingNow) {
      charge = Math.min(1, charge + dt * 1.45);
    } else {
      if (wasHolding && charge > 0.14) {
        const [fx, fy] = getActiveFocalPoint();
        triggerRippleAt(fx, fy, 1.35);
        focusImpulse = 0.45;
        kickZoom = -0.05;
        callbacks?.onHoldBurst?.();
      }
      charge = Math.max(0, charge - dt * 2.2);
    }
    wasHolding = isHoldingNow;

    // 2. Compute choreographed Robot-Arm target pose (Zoom, Pan, Roll, Pitch/Yaw)
    const isPortrait = window.innerWidth / Math.max(window.innerHeight, 1) < 0.95;

    // Transition peaks (0..1 bell curves at each of the 4 cut boundaries)
    const peak01 = Math.exp(-Math.pow((s - 0.205) / 0.048, 2)); // Hero -> Macro Dive
    const peak12 = Math.exp(-Math.pow((s - 0.445) / 0.048, 2)); // Macro -> Pour Whip
    const peak23 = Math.exp(-Math.pow((s - 0.685) / 0.048, 2)); // Pour -> 90deg Crane
    const peak34 = Math.exp(-Math.pow((s - 0.910) / 0.045, 2)); // Table -> Pull-Back

    // Act 01 hesitation drift when No Bean (locks crisp on Growth / Specialist!)
    const act1DecafDrift =
      actIdx === 0 && st.roastMode === "decaf" && !reducedMotion
        ? Math.sin(realT * 1.9) * 0.009
        : 0;
    const act1Zoom =
      actIdx === 0
        ? st.roastMode === "decaf"
          ? 1.03
          : st.roastMode === "craft"
            ? 1.12
            : 1.07
        : 1.05;

    const targetZoomBase =
      act1Zoom +
      charge * 0.085 +
      (peak01 * 0.10 + peak12 * 0.08) * (isPortrait ? 0.35 : 1) +
      kickZoom;

    const targetRoll = reducedMotion
      ? 0
      : (peak01 * 0.068 * Math.sign(sVel || 1) -
          peak12 * 0.062 * Math.sign(sVel || 1) +
          peak23 * 0.078 * Math.sign(sVel || 1) -
          peak34 * 0.04 * Math.sign(sVel || 1) +
          partnerSpring.vel * 0.014 +
          kickRoll) *
        (isPortrait ? 0.35 : 1);

    const targetPitch = reducedMotion
      ? 0
      : (peak01 * 0.28 - peak12 * 0.22 + peak23 * 0.20 + sVel * 0.09) *
        (isPortrait ? 0.2 : 1);
    const targetYaw = reducedMotion
      ? 0
      : (peak12 * 0.24 - partnerSpring.vel * 0.08 + act1DecafDrift * 5.0) *
        (isPortrait ? 0.2 : 1);

    // Guarantee safe overscan zoom so roll & pan NEVER reveal edge clamp
    const safeMinZoom =
      1.035 + Math.abs(rollSpring.val) * 0.72 + Math.abs(panXSpring.val) * 0.55;
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
      stepSpring(panXSpring, act1DecafDrift, 85, 15, dt);
      stepSpring(panYSpring, Math.sin(realT * 0.42) * 0.004, 85, 15, dt);
      stepSpring(rollSpring, targetRoll, 95, 14.5, dt);
      stepSpring(pitchSpring, targetPitch, 85, 14, dt);
      stepSpring(yawSpring, targetYaw, 85, 14, dt);
    }

    // Decay optical kicks & rack-focus quickly so shots lock razor-sharp
    kickZoom *= Math.exp(-dt * 9.5);
    kickRoll *= Math.exp(-dt * 10.0);
    focusImpulse *= Math.exp(-dt * 7.5);

    // Compute true directional shutter velocity vector for 9-tap motion blur!
    const whipX = reducedMotion
      ? 0
      : (peak12 * sVel * 0.58 + partnerSpring.vel * 0.26 + panXSpring.vel * 0.4);
    const whipY = reducedMotion
      ? 0
      : (peak01 * sVel * 0.65 + peak23 * sVel * 0.45 + panYSpring.vel * 0.4);
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

    // Broadcast live camera rig transforms to CSS custom properties for zero-lag Story HUD lock!
    const hudShiftX = -panXSpring.val * 100;
    const hudShiftY = panYSpring.val * 100;
    const hudScale = 1 + (zoomSpring.val - 1.05) * 0.45;
    rootStyle.setProperty("--cc-hold-charge", charge.toFixed(3));
    rootStyle.setProperty("--cc-rig-x", `${hudShiftX.toFixed(2)}px`);
    rootStyle.setProperty("--cc-rig-y", `${hudShiftY.toFixed(2)}px`);
    rootStyle.setProperty("--cc-rig-scale", hudScale.toFixed(4));
    rootStyle.setProperty("--cc-rig-roll", `${(-rollSpring.val * 57.3).toFixed(2)}deg`);
    rootStyle.setProperty("--cc-whip-energy", whipEnergy.toFixed(3));

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
    uniforms.uRoastLevel!.value = roastSmooth;
    uniforms.uRoastConfirm!.value = confirmSmooth;
    uniforms.uBrewActive!.value = brewSmooth;
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
