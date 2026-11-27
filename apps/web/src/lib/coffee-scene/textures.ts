import * as THREE from "three";

/**
 * Procedural Studio Softbox Environment Map (PMREM).
 * Gives porcelain cups crisp overhead studio reflections, warm amber side highlights,
 * and subtle OpenBoa Ink Blue specular rim lighting with zero external HDRI fetches.
 */
export function createStudioEnvironment(
  renderer: THREE.WebGLRenderer,
): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x28211c);

  // Overhead warm diffused softbox
  const mainSoftbox = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e9).multiplyScalar(2.4), side: THREE.DoubleSide }),
  );
  mainSoftbox.position.set(1.5, 8.5, 2.0);
  mainSoftbox.lookAt(0, 0, 0);
  envScene.add(mainSoftbox);

  // Warm honey-ochre key strip (left-front)
  const warmKey = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 9),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf8cfa0).multiplyScalar(1.9), side: THREE.DoubleSide }),
  );
  warmKey.position.set(-8.5, 3.8, 5.2);
  warmKey.lookAt(0, 0, 0);
  envScene.add(warmKey);

  // Cool OpenBoa Ink Blue architectural rim card (right-rear)
  const inkRim = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6da9cf).multiplyScalar(1.75), side: THREE.DoubleSide }),
  );
  inkRim.position.set(8.5, 3.2, -5.0);
  inkRim.lookAt(0, 0, 0);
  envScene.add(inkRim);

  // Crisp porcelain specular window highlight (front-right)
  const specCard = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 6.5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2.2), side: THREE.DoubleSide }),
  );
  specCard.position.set(6.5, 4.6, 5.5);
  specCard.lookAt(0, 0, 0);
  envScene.add(specCard);

  // Warm café tabletop bounce below
  const tableBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4a3728), side: THREE.DoubleSide }),
  );
  tableBounce.position.set(0, -6.0, 0);
  tableBounce.rotation.x = -Math.PI / 2;
  envScene.add(tableBounce);

  const envRT = pmrem.fromScene(envScene, 0.04);
  const envTex = envRT.texture;

  // Dispose temporary env scene geometries & materials
  envScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  pmrem.dispose();

  return envTex;
}

/**
 * Tactile studio porcelain micro-grain bump texture — 100% horizontally seamless
 * (periodic in X so LatheGeometry has zero visible vertical seam).
 */
export function createPorcelainBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      // Subtle wheel-thrown horizontal ceramic micro-rings
      const band = Math.sin((y / size) * Math.PI * 2 * 18) * 3.5;
      for (let x = 0; x < size; x++) {
        const ax = (x / size) * Math.PI * 2;
        const ay = (y / size) * Math.PI * 2;
        // Strictly periodic micro-glaze undulation (seamless at x=0 and x=size)
        const glaze =
          Math.sin(ax * 3 + ay * 2) * 2.2 +
          Math.cos(ax * 7 - ay * 5) * 1.6 +
          Math.sin(ax * 13 + ay * 9) * 1.1;
        const i = (y * size + x) * 4;
        const val = Math.max(0, Math.min(255, Math.round(128 + band + glaze)));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Organic dark-roast coffee bean diffuse & bump maps.
 * Produces authentic mottled mahogany roast grain and subtle lighter chaff crease tone.
 */
export function createBeanRoastTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext("2d");

  if (cCtx && bCtx) {
    // Rich dark-roast base
    cCtx.fillStyle = "#482917";
    cCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, size, size);

    let seed = 9001;
    const rand = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Organic mottled roast patches
    for (let k = 0; k < 280; k++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 6 + rand() * 24;
      const warm = rand() > 0.45;
      const grad = cCtx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(
        0,
        warm ? "rgba(116, 67, 34, 0.24)" : "rgba(38, 19, 10, 0.28)",
      );
      grad.addColorStop(1, "rgba(72, 41, 23, 0)");
      cCtx.fillStyle = grad;
      cCtx.beginPath();
      cCtx.arc(x, y, r, 0, Math.PI * 2);
      cCtx.fill();

      const bGrad = bCtx.createRadialGradient(x, y, 0, x, y, r * 0.7);
      const bVal = rand() > 0.5 ? 168 : 92;
      bGrad.addColorStop(0, `rgba(${bVal},${bVal},${bVal},0.22)`);
      bGrad.addColorStop(1, "rgba(128,128,128,0)");
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(x, y, r * 0.7, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Subtle fine pores across the roasted bean skin
    for (let k = 0; k < 900; k++) {
      const x = rand() * size;
      const y = rand() * size;
      const alpha = 0.08 + rand() * 0.14;
      cCtx.fillStyle = `rgba(26, 12, 6, ${alpha})`;
      cCtx.fillRect(x, y, 1.5, 1.5);
      bCtx.fillStyle = `rgba(70, 70, 70, ${alpha * 1.4})`;
      bCtx.fillRect(x, y, 1.5, 1.5);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

/**
 * Soft grounded studio contact shadow under saucers.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, size * 0.06, cx, cx, size * 0.5);
    grad.addColorStop(0, "rgba(28, 18, 11, 0.55)");
    grad.addColorStop(0.45, "rgba(28, 18, 11, 0.24)");
    grad.addColorStop(0.75, "rgba(28, 18, 11, 0.07)");
    grad.addColorStop(1, "rgba(28, 18, 11, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
