import * as THREE from "three";

/* ============================================================================
   CUSTOM GLSL SHADERS — ESPRESSO CREMA LIQUID, CURLING STEAM, POUR STREAM
   ============================================================================ */

const CREMA_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uRippleTime;
  uniform float uRippleStrength;
  uniform float uPourImpact;

  varying vec2 vUv;
  varying vec3 vLocalPos;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float r = length(pos.xy);

    // Subtle organic liquid meniscus breathing + live expanding ripple wave
    float ambientWave = sin(r * 7.5 - uTime * 2.1) * 0.008 + cos(pos.x * 5.0 + uTime * 1.4) * 0.005;
    float ringDist = abs(r - uRippleTime * 1.65);
    float ripple = exp(-ringDist * ringDist * 28.0) * sin((r - uRippleTime * 1.65) * 28.0)
      * uRippleStrength * exp(-uRippleTime * 1.35);

    // Center dimple + concentric micro-waves during Act 03 espresso pour
    float pourRipple = sin(r * 24.0 - uTime * 9.5) * exp(-r * 2.6) * 0.022 * uPourImpact;
    float pourDimple = -exp(-r * r * 18.0) * 0.045 * uPourImpact;

    float h = (ambientWave + ripple * 0.055 + pourRipple + pourDimple) * smoothstep(1.12, 0.2, r);
    pos.z += h;

    vLocalPos = pos;
    vWave = ripple + pourRipple * 8.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const CREMA_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uRoastLevel;     // 0.0 = watery decaf, 0.5 = warm golden crema, 1.0 = deep espresso + ink shimmer
  uniform float uSwirlSpeed;
  uniform float uRippleStrength;
  uniform float uRippleTime;
  uniform float uPourImpact;
  uniform float uBoundaryAlert;  // 0..1 warm amber boundary edge cue
  uniform float uPartnerTint;    // 0.0 = warm roast (@claire/you), 1.0 = ink-slate espresso (@david)

  varying vec2 vUv;
  varying vec3 vLocalPos;
  varying float vWave;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.52;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = rot * p * 2.05 + vec2(1.7, 9.2);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vLocalPos.xy;
    float r = length(p);
    float angle = atan(p.y, p.x);

    // Gentle spiral crema swirl driven by roast energy & pour
    float swirl = (0.28 + uSwirlSpeed * 0.45) * uTime + (1.0 - smoothstep(0.0, 1.05, r)) * (1.2 + uPourImpact * 1.4);
    float cs = cos(swirl * 0.35);
    float sn = sin(swirl * 0.35);
    vec2 sp = mat2(cs, -sn, sn, cs) * p;

    // Domain-warped FBM for realistic tiger-striping espresso crema
    vec2 q = vec2(
      fbm(sp * 2.4 + vec2(0.0, uTime * 0.08)),
      fbm(sp * 2.4 + vec2(5.2, -uTime * 0.07))
    );
    float cremaPattern = fbm(sp * 3.1 + q * 2.3);
    float microBubbles = noise(sp * 28.0 + uTime * 0.15);

    // Palette 0: Lifeless pale watery decaf ("No Bean")
    vec3 decafCore = vec3(0.60, 0.56, 0.52);
    vec3 decafEdge = vec3(0.76, 0.73, 0.69);
    vec3 decafCol = mix(decafCore, decafEdge, smoothstep(0.2, 0.98, r) * 0.75 + cremaPattern * 0.25);

    // Palette 1: Rich specialty golden-hazelnut tiger-stripe crema (Growth Roast / @claire)
    vec3 espressoDark = vec3(0.11, 0.055, 0.025);
    vec3 roastAmber = vec3(0.49, 0.26, 0.11);
    vec3 goldenCrema = vec3(0.82, 0.58, 0.33);
    vec3 foamHighlight = vec3(0.93, 0.80, 0.62);

    float meniscus = smoothstep(0.58, 1.02, r);
    float tigerBand = smoothstep(0.28, 0.78, cremaPattern + meniscus * 0.34);
    vec3 warmCol = mix(espressoDark, roastAmber, smoothstep(0.18, 0.55, cremaPattern + meniscus * 0.28));
    warmCol = mix(warmCol, goldenCrema, tigerBand * 0.82);
    warmCol = mix(warmCol, foamHighlight, smoothstep(0.76, 0.98, r) * (0.35 + microBubbles * 0.35));

    // Palette 2: Deep dark roast with subtle OpenBoa Ink Blue specular refraction (Specialist / @david)
    vec3 deepDark = vec3(0.075, 0.045, 0.03);
    vec3 deepMahogany = vec3(0.32, 0.17, 0.085);
    vec3 cremaWarm = vec3(0.68, 0.45, 0.25);
    vec3 inkShimmer = vec3(0.14, 0.43, 0.60);

    vec3 craftCol = mix(deepDark, deepMahogany, smoothstep(0.22, 0.62, cremaPattern + meniscus * 0.25));
    craftCol = mix(craftCol, cremaWarm, smoothstep(0.55, 0.92, cremaPattern + meniscus * 0.4) * 0.68);
    craftCol += inkShimmer * (smoothstep(0.65, 1.0, r) * 0.26 + smoothstep(0.45, 0.85, sin(angle * 2.0 + uTime * 0.45) * 0.5 + 0.5) * 0.12);

    // Blend roast level smoothly: 0 -> decaf, 0.5 -> warmCol, 1.0 -> craftCol
    vec3 brewed = mix(warmCol, craftCol, clamp((uRoastLevel - 0.5) * 2.0 + uPartnerTint * 0.85, 0.0, 1.0));
    vec3 col = mix(decafCol, brewed, smoothstep(0.02, 0.45, uRoastLevel));

    // Studio softbox overhead specular glint across the liquid surface
    vec2 glintPos = vec2(-0.34, 0.36);
    float glint = exp(-dot(p - glintPos, p - glintPos) * 5.8) * (0.22 + uRoastLevel * 0.18);
    col += vec3(1.0, 0.96, 0.90) * glint;

    // Brighten crema crest on active ripples & pour impact
    float rippleGlow = clamp(abs(vWave) * 3.2, 0.0, 0.4);
    col += mix(vec3(0.95, 0.78, 0.55), vec3(0.45, 0.74, 0.90), uPartnerTint) * rippleGlow;

    // Center foam bloom during espresso pour
    float pourFoam = exp(-r * r * 6.5) * uPourImpact * (0.35 + microBubbles * 0.35);
    col = mix(col, foamHighlight, pourFoam * 0.65);

    // Subtle amber boundary pulse along outer meniscus when boundary is triggered
    float boundaryRing = smoothstep(0.74, 0.96, r) * uBoundaryAlert * (0.65 + 0.35 * sin(uTime * 5.5));
    col = mix(col, vec3(0.92, 0.55, 0.22), boundaryRing * 0.72);

    // Soft ambient occlusion tucked right under the ceramic inner lip
    col *= 1.0 - smoothstep(0.88, 1.06, r) * 0.32;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const STEAM_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWindX;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float h = uv.y;
    // Gentle rising organic curl pushed softly by cursor breeze
    pos.x += sin(h * 4.5 - uTime * 1.45 + pos.z * 2.0) * 0.18 * h + uWindX * h * 0.35;
    pos.z += cos(h * 3.8 - uTime * 1.15 + pos.x * 1.8) * 0.14 * h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const STEAM_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSteamIntensity;
  uniform float uPolarity;
  uniform float uTint;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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

  void main() {
    vec2 uv = vUv;
    float n1 = noise(vec2(uv.x * 3.2, uv.y * 2.6 - uTime * 0.58));
    float n2 = noise(vec2(uv.x * 6.4 + 2.1, uv.y * 4.8 - uTime * 0.92));
    float wisp = smoothstep(0.32, 0.82, n1 * 0.65 + n2 * 0.35);

    float edgeX = smoothstep(0.0, 0.36, uv.x) * smoothstep(1.0, 0.64, uv.x);
    float edgeY = smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.16, uv.y);

    float alpha = wisp * edgeX * edgeY * uSteamIntensity * mix(0.18, 0.34, uPolarity);
    // Warm soft aroma mist in Light Mode, luminous ivory-mist steam in Dark Mode
    vec3 warmSteam = mix(vec3(0.56, 0.46, 0.38), vec3(0.98, 0.95, 0.90), uPolarity);
    vec3 inkSteam = mix(vec3(0.28, 0.48, 0.62), vec3(0.72, 0.88, 0.97), uPolarity);
    vec3 col = mix(warmSteam, inkSteam, uTint * 0.62);

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const POUR_VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Delicate glossy liquid ripple along the falling stream
    float wobble = sin(uv.x * 26.0 - uTime * 14.0) * 0.012;
    pos += normal * wobble;
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const POUR_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPourOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    float flowBand = 0.5 + 0.5 * sin(vUv.x * 34.0 - uTime * 18.0);

    vec3 deepEspresso = vec3(0.14, 0.065, 0.025);
    vec3 amberSubsurface = vec3(0.68, 0.36, 0.12);
    vec3 specGlaze = vec3(1.0, 0.93, 0.82);

    vec3 col = mix(deepEspresso, amberSubsurface, fresnel * 0.78 + flowBand * 0.16);
    col += specGlaze * pow(fresnel, 3.2) * 0.72;

    float endsFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    float alpha = uPourOpacity * endsFade * 0.95;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ============================================================================
   SCULPTED 3D COFFEE BEAN GEOMETRY (Authentic Macro S-Curve Cleft)
   ============================================================================ */

export function createCoffeeBeanGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 32, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);

    // Elongated asymmetric bean proportions
    let x = ux * 0.42;
    let y = uy * 0.58;
    let z = uz * 0.33;

    // Slight taper toward poles like a genuine Arabica bean
    const poleTaper = 1.0 - 0.12 * uy * uy;
    x *= poleTaper;
    z *= poleTaper;

    // Flatten ventral face (z > 0) and carve realistic sinusoidal S-curve center cleft
    if (uz > -0.15) {
      const flatFactor = THREE.MathUtils.smoothstep(uz, -0.15, 0.55);
      z = THREE.MathUtils.lerp(z, z * 0.42, flatFactor);

      const sCurve = Math.sin(uy * 3.1) * 0.055;
      const distFromCleft = Math.abs(x - sCurve);
      const cleftMask = Math.exp(-distFromCleft * distFromCleft * 145.0) * (1.0 - uy * uy * 0.88);
      const ventralMask = THREE.MathUtils.smoothstep(uz, 0.05, 0.5);

      // Indent deep central groove + delicate raised lip edges on each side
      const ridge =
        Math.exp(-Math.pow(distFromCleft - 0.07, 2) * 320.0) *
        (1.0 - uy * uy * 0.85) *
        0.025;
      z -= cleftMask * ventralMask * 0.16;
      z += ridge * ventralMask;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

/* ============================================================================
   PHOTOREALISTIC 3D SPECIALTY PORCELAIN CUP + SAUCER + CREMA + STEAM
   ============================================================================ */

export interface CoffeeCupAssembly {
  group: THREE.Group;
  cremaUniforms: Record<string, THREE.IUniform>;
  steamUniforms: Record<string, THREE.IUniform>;
  cupMaterial: THREE.MeshPhysicalMaterial;
  saucerMaterial: THREE.MeshPhysicalMaterial;
  shadowMaterial: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createCoffeeCupAssembly(opts: {
  variant: "primary" | "partner";
  porcelainBump: THREE.Texture;
  contactShadowTex: THREE.Texture;
}): CoffeeCupAssembly {
  const { variant, porcelainBump, contactShadowTex } = opts;
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const isPartner = variant === "partner";

  // 1. Ceramic Materials — Bone-white porcelain (Primary) vs Studio Ink-Slate Stoneware (Partner)
  const cupMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isPartner ? 0x1e2b36 : 0xf9f5ee),
    roughness: isPartner ? 0.22 : 0.12,
    metalness: isPartner ? 0.08 : 0.01,
    clearcoat: 1.0,
    clearcoatRoughness: isPartner ? 0.12 : 0.04,
    reflectivity: 0.92,
    bumpMap: porcelainBump,
    bumpScale: 0.0022,
    sheen: 0.22,
    sheenColor: new THREE.Color(isPartner ? 0x4c7c9b : 0xfff8ee),
    side: THREE.FrontSide,
  });

  const saucerMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isPartner ? 0x18232c : 0xf4efe7),
    roughness: isPartner ? 0.24 : 0.14,
    metalness: isPartner ? 0.08 : 0.01,
    clearcoat: 0.95,
    clearcoatRoughness: isPartner ? 0.14 : 0.06,
    bumpMap: porcelainBump,
    bumpScale: 0.0022,
    side: THREE.FrontSide,
  });
  disposables.push(cupMaterial, saucerMaterial);

  // 2. Sculpted Specialty Cup Body (LatheGeometry with solid double wall & rounded drinking lip)
  const cupPoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.06),
    new THREE.Vector2(0.62, 0.06),
    new THREE.Vector2(0.68, 0.08),
    new THREE.Vector2(0.69, 0.14),
    new THREE.Vector2(0.76, 0.26),
    new THREE.Vector2(0.95, 0.56),
    new THREE.Vector2(1.11, 0.94),
    new THREE.Vector2(1.18, 1.32),
    new THREE.Vector2(1.20, 1.56),
    // Rounded porcelain lip
    new THREE.Vector2(1.18, 1.62),
    new THREE.Vector2(1.13, 1.63),
    new THREE.Vector2(1.09, 1.59),
    // Smooth glossy interior descending to bottom
    new THREE.Vector2(1.07, 1.36),
    new THREE.Vector2(0.98, 0.94),
    new THREE.Vector2(0.81, 0.52),
    new THREE.Vector2(0.58, 0.24),
    new THREE.Vector2(0.30, 0.17),
    new THREE.Vector2(0.0, 0.16),
  ];
  const cupGeo = new THREE.LatheGeometry(cupPoints, 96);
  cupGeo.computeVertexNormals();
  const cupMesh = new THREE.Mesh(cupGeo, cupMaterial);
  // Tuck lathe UV seam away toward the rear-handle axis
  cupMesh.rotation.y = Math.PI;
  group.add(cupMesh);
  disposables.push(cupGeo);

  // Delicate glazed rim accent ring on the partner stoneware cup (subtle Ink Blue studio finish)
  if (isPartner) {
    const rimGeo = new THREE.TorusGeometry(1.145, 0.032, 16, 80);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x28678d),
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 1.615;
    group.add(rimMesh);
    disposables.push(rimGeo, rimMat);
  }

  // 3. Ergonomic Sculpted Cup Handle (smooth D-ear curve)
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.11, 1.34, 0),
    new THREE.Vector3(1.48, 1.36, 0),
    new THREE.Vector3(1.66, 1.08, 0),
    new THREE.Vector3(1.54, 0.72, 0),
    new THREE.Vector3(1.24, 0.56, 0),
    new THREE.Vector3(0.95, 0.54, 0),
  ]);
  const handleGeo = new THREE.TubeGeometry(handleCurve, 44, 0.088, 18, false);
  // Gently flatten handle cross-section slightly along Z for ceramic comfort feel
  handleGeo.scale(1.0, 1.0, 0.78);
  handleGeo.computeVertexNormals();
  const handleMesh = new THREE.Mesh(handleGeo, cupMaterial);
  group.add(handleMesh);
  disposables.push(handleGeo);

  // 4. Matching Broad Studio Saucer (LatheGeometry)
  const saucerPoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.05),
    new THREE.Vector2(0.86, -0.05),
    new THREE.Vector2(0.94, -0.02),
    new THREE.Vector2(1.45, 0.08),
    new THREE.Vector2(1.88, 0.22),
    new THREE.Vector2(1.94, 0.27),
    new THREE.Vector2(1.91, 0.31),
    new THREE.Vector2(1.83, 0.29),
    new THREE.Vector2(1.38, 0.16),
    new THREE.Vector2(0.86, 0.06),
    new THREE.Vector2(0.76, 0.04),
    new THREE.Vector2(0.68, 0.045),
    new THREE.Vector2(0.0, 0.045),
  ];
  const saucerGeo = new THREE.LatheGeometry(saucerPoints, 96);
  saucerGeo.computeVertexNormals();
  const saucerMesh = new THREE.Mesh(saucerGeo, saucerMaterial);
  saucerMesh.rotation.y = Math.PI;
  group.add(saucerMesh);
  disposables.push(saucerGeo);

  // 5. Espresso Crema Liquid Surface (Ring/Disc with high subdivision for smooth wave ripples)
  const liquidGeo = new THREE.CircleGeometry(1.075, 72);
  // Add concentric subdivisions by building a Polar RingGrid so ripples displace smoothly
  liquidGeo.dispose();
  const radialSegs = 64;
  const ringSegs = 24;
  const liquidGrid = new THREE.BufferGeometry();
  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const radius = 1.072;

  for (let r = 0; r <= ringSegs; r++) {
    const t = r / ringSegs;
    const rad = t * radius;
    for (let s = 0; s <= radialSegs; s++) {
      const a = (s / radialSegs) * Math.PI * 2;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      verts.push(x, y, 0);
      uvs.push(x / (radius * 2) + 0.5, y / (radius * 2) + 0.5);
    }
  }
  const stride = radialSegs + 1;
  for (let r = 0; r < ringSegs; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  liquidGrid.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  liquidGrid.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  liquidGrid.setIndex(indices);

  const cremaUniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uRoastLevel: { value: isPartner ? 0.95 : 0.6 },
    uSwirlSpeed: { value: 1.0 },
    uRippleTime: { value: 4.0 },
    uRippleStrength: { value: 0.0 },
    uPourImpact: { value: 0.0 },
    uBoundaryAlert: { value: 0.0 },
    uPartnerTint: { value: isPartner ? 1.0 : 0.0 },
  };

  const cremaMat = new THREE.ShaderMaterial({
    vertexShader: CREMA_VERTEX,
    fragmentShader: CREMA_FRAGMENT,
    uniforms: cremaUniforms,
  });
  const liquidMesh = new THREE.Mesh(liquidGrid, cremaMat);
  liquidMesh.rotation.x = -Math.PI / 2;
  liquidMesh.position.y = 1.37;
  group.add(liquidMesh);
  disposables.push(liquidGrid, cremaMat);

  // 6. Soft Volumetric Curling Steam Wisps (3 intersecting curved planes)
  const steamUniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uWindX: { value: 0 },
    uSteamIntensity: { value: 0.85 },
    uPolarity: { value: 0 },
    uTint: { value: isPartner ? 1.0 : 0.0 },
  };
  const steamMat = new THREE.ShaderMaterial({
    vertexShader: STEAM_VERTEX,
    fragmentShader: STEAM_FRAGMENT,
    uniforms: steamUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const steamGeo = new THREE.PlaneGeometry(1.45, 2.35, 10, 20);
  steamGeo.translate(0, 1.18, 0);
  disposables.push(steamGeo, steamMat);

  for (let k = 0; k < 3; k++) {
    const wisp = new THREE.Mesh(steamGeo, steamMat);
    wisp.position.set((k - 1) * 0.16, 1.42, (k === 1 ? 0.12 : -0.08));
    wisp.rotation.y = (k * Math.PI) / 3 + 0.35;
    group.add(wisp);
  }

  // 7. Grounded Contact Shadow beneath Saucer
  const shadowGeo = new THREE.PlaneGeometry(4.6, 4.6);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.07;
  group.add(shadowMesh);
  disposables.push(shadowGeo, shadowMaterial);

  return {
    group,
    cremaUniforms,
    steamUniforms,
    cupMaterial,
    saucerMaterial,
    shadowMaterial,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}

/* ============================================================================
   GLOSSY 3D ESPRESSO POUR STREAM (Act 03 — Brew Everywhere)
   ============================================================================ */

export interface PourStreamAssembly {
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  dispose: () => void;
}

export function createPourStream(): PourStreamAssembly {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.42, 4.45, -0.05),
    new THREE.Vector3(0.18, 3.35, 0.02),
    new THREE.Vector3(0.04, 2.28, 0.01),
    new THREE.Vector3(0.0, 1.32, 0.0),
  ]);

  const geo = new THREE.TubeGeometry(curve, 52, 0.068, 16, false);
  // Subtle natural gravity thinning toward the splash point
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = uv.getX(i);
    const center = curve.getPointAt(Math.min(1, Math.max(0, t)));
    const scale = THREE.MathUtils.lerp(1.22, 0.62, t);
    pos.setXYZ(
      i,
      center.x + (pos.getX(i) - center.x) * scale,
      pos.getY(i),
      center.z + (pos.getZ(i) - center.z) * scale,
    );
  }
  geo.computeVertexNormals();

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uPourOpacity: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: POUR_VERTEX,
    fragmentShader: POUR_FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  return {
    mesh,
    uniforms,
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

/* ============================================================================
   TWO-CUP PERSPECTIVE BRIDGE (Act 04 — Coffee Chat)
   ============================================================================ */

export interface TableBridgeAssembly {
  group: THREE.Group;
  update: (opts: {
    time: number;
    visibility: number;
    direction: number; // -1 toward claire, +1 toward david, 0 balanced
    polarity: number;
  }) => void;
  dispose: () => void;
}

export function createTableBridge(): TableBridgeAssembly {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.52, 1.56, 0.06),
    new THREE.Vector3(-0.62, 2.38, 0.24),
    new THREE.Vector3(0.62, 2.38, 0.24),
    new THREE.Vector3(1.52, 1.56, 0.06),
  ]);

  const pts = curve.getPoints(72);
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0x175174),
    transparent: true,
    opacity: 0,
  });
  const arcLine = new THREE.Line(lineGeo, lineMat);
  group.add(arcLine);

  // Subtle secondary parallel aroma arc
  const upperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.46, 1.68, 0.0),
    new THREE.Vector3(-0.56, 2.58, 0.16),
    new THREE.Vector3(0.56, 2.58, 0.16),
    new THREE.Vector3(1.46, 1.68, 0.0),
  ]);
  const upperLineGeo = new THREE.BufferGeometry().setFromPoints(upperCurve.getPoints(72));
  const upperLineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0xc48b52),
    transparent: true,
    opacity: 0,
  });
  const upperArc = new THREE.Line(upperLineGeo, upperLineMat);
  group.add(upperArc);

  // Delicate luminous micro-motes gliding smoothly between both cups
  const pearlCount = 10;
  const pearlGeo = new THREE.SphereGeometry(0.026, 10, 10);
  const pearlMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xc48b52),
    transparent: true,
    opacity: 0,
  });

  const pearls: THREE.Mesh[] = [];
  for (let i = 0; i < pearlCount; i++) {
    const m = new THREE.Mesh(pearlGeo, pearlMat);
    group.add(m);
    pearls.push(m);
  }

  const warmCol = new THREE.Color(0xb8763a);
  const inkCol = new THREE.Color(0x175174);
  const inkLight = new THREE.Color(0x79b3d6);

  return {
    group,
    update: ({ time, visibility, direction, polarity }) => {
      group.visible = visibility > 0.015;
      if (!group.visible) return;

      const targetLineCol =
        direction > 0.2
          ? polarity > 0.5
            ? inkLight
            : inkCol
          : warmCol;
      lineMat.color.lerp(targetLineCol, 0.1);
      lineMat.opacity = visibility * (0.34 + polarity * 0.28);

      upperLineMat.color.lerp(targetLineCol, 0.1);
      upperLineMat.opacity = visibility * (0.14 + polarity * 0.16);

      pearlMat.color.lerp(targetLineCol, 0.1);
      pearlMat.opacity = visibility * (0.68 + polarity * 0.22);

      const flowDir = direction === 0 ? 1 : direction;
      for (let i = 0; i < pearlCount; i++) {
        let t = (i / pearlCount + time * 0.16 * flowDir) % 1;
        if (t < 0) t += 1;
        const p = curve.getPointAt(t);
        const pulse = Math.sin(t * Math.PI);
        pearls[i]!.position.copy(p);
        pearls[i]!.scale.setScalar(0.45 + pulse * 0.85);
      }
    },
    dispose: () => {
      lineGeo.dispose();
      lineMat.dispose();
      upperLineGeo.dispose();
      upperLineMat.dispose();
      pearlGeo.dispose();
      pearlMat.dispose();
    },
  };
}
