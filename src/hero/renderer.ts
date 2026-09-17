import {
  BufferAttribute, BufferGeometry, Color, PerspectiveCamera, Points, Scene, ShaderMaterial,
  SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from "three";
import type { Weights } from "./scroll";
import { FRAGMENT, VERTEX } from "./shaders";
import { TIERS } from "./tiers";

const CAMERA_Z = 8.2;
const FOV = 42;

export interface Targets {
  p0: Float32Array;
  col: Float32Array;
  p1: Float32Array;
  p2: Float32Array;
  p3: Float32Array;
}

export interface Offsets {
  off0: [number, number];
  off1: [number, number];
  off2: [number, number];
  off3: [number, number];
  s0: number;
  s1: number;
  s3: number;
}

export interface HeroRenderer {
  readonly canvas: HTMLCanvasElement;
  setWeights(w: Weights): void;
  setOffsets(o: Offsets): void;
  setPointer(clientX: number, clientY: number): void;
  clearPointer(): void;
  setTier(idx: number): void;
  replaceTarget(which: 1 | 2 | 3, data: Float32Array): void;
  resize(width: number, height: number): void;
  unitsPerPixel(): number;
  visibleSize(): { w: number; h: number };
  frame(timeMs: number): void;
  dispose(): void;
}

/** Imperative three.js. No React, no layout reads. The caller owns the loop. */
export function createRenderer(
  container: HTMLElement, t: Targets, count: number, tierIdx: number, reduced: boolean,
): HeroRenderer {
  const tier = TIERS[tierIdx] ?? TIERS[TIERS.length - 1]!;

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;

  const rand = new Float32Array(count);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    rand[i] = Math.random();
    size[i] = 0.8 + Math.random() * 0.55;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(t.p0.slice(), 3));
  geo.setAttribute("aP0", new BufferAttribute(t.p0, 3));
  geo.setAttribute("aP1", new BufferAttribute(t.p1, 3));
  geo.setAttribute("aP2", new BufferAttribute(t.p2, 3));
  geo.setAttribute("aP3", new BufferAttribute(t.p3, 3));
  geo.setAttribute("aColor", new BufferAttribute(t.col, 3));
  geo.setAttribute("aRand", new BufferAttribute(rand, 1));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  let active = Math.min(count, tier.count);
  geo.setDrawRange(0, active);

  const uniforms = {
    uW0: { value: 1 }, uW1: { value: 0 }, uW2: { value: 0 }, uW3: { value: 0 },
    uS0: { value: 5 }, uS1: { value: 1 }, uS3: { value: 1 },
    uOff0: { value: new Vector2() }, uOff1: { value: new Vector2() },
    uOff2: { value: new Vector2() }, uOff3: { value: new Vector2() },
    uRot: { value: new Vector2() },
    uTime: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
    uSize: { value: 700 / Math.sqrt(active) },
    uReduced: { value: reduced ? 1 : 0 },
    uMouse: { value: new Vector3(999, 999, 0) },
    uAccent: { value: new Color(0xd3b2a0) },
    uGold: { value: new Color(0xc9a227) },
  };

  const material = new ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const points = new Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  let W = 1, H = 1;
  const target: Weights = { w0: 1, w1: 0, w2: 0, w3: 0, alpha: 1 };
  const cur = { w0: 1, w1: 0, w2: 0, w3: 0 };
  let mx = 0, my = 0, hasPointer = false, rotX = 0, rotY = 0;
  const v = new Vector3();

  function unitsPerPixel(): number {
    return (2 * CAMERA_Z * Math.tan((FOV / 2) * (Math.PI / 180))) / H;
  }

  function resize(width: number, height: number): void {
    W = width;
    H = height;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  function setPointer(clientX: number, clientY: number): void {
    mx = (clientX / W) * 2 - 1;
    my = -(clientY / H) * 2 + 1;
    hasPointer = true;
    v.set(mx, my, 0.5).unproject(camera).sub(camera.position).normalize();
    uniforms.uMouse.value.copy(camera.position).add(v.multiplyScalar(-camera.position.z / v.z));
  }

  function frame(timeMs: number): void {
    uniforms.uTime.value = timeMs * 0.001;
    const k = reduced ? 1 : 0.075;
    cur.w0 += (target.w0 - cur.w0) * k;
    cur.w1 += (target.w1 - cur.w1) * k;
    cur.w2 += (target.w2 - cur.w2) * k;
    cur.w3 += (target.w3 - cur.w3) * k;
    uniforms.uW0.value = cur.w0;
    uniforms.uW1.value = cur.w1;
    uniforms.uW2.value = cur.w2;
    uniforms.uW3.value = cur.w3;
    if (!reduced) {
      // Parallax replaces deformation: the portrait turns a few degrees toward the cursor.
      const amt = cur.w0 * 0.075;
      rotY += ((hasPointer ? mx : 0) * amt - rotY) * 0.06;
      rotX += ((hasPointer ? -my : 0) * amt * 0.7 - rotX) * 0.06;
      uniforms.uRot.value.set(rotY, rotX);
    }
    renderer.render(scene, camera);
  }

  return {
    canvas: renderer.domElement,
    setWeights(w) {
      target.w0 = w.w0;
      target.w1 = w.w1;
      target.w2 = w.w2;
      target.w3 = w.w3;
    },
    setOffsets(o) {
      uniforms.uOff0.value.set(o.off0[0], o.off0[1]);
      uniforms.uOff1.value.set(o.off1[0], o.off1[1]);
      uniforms.uOff2.value.set(o.off2[0], o.off2[1]);
      uniforms.uOff3.value.set(o.off3[0], o.off3[1]);
      uniforms.uS0.value = o.s0;
      uniforms.uS1.value = o.s1;
      uniforms.uS3.value = o.s3;
    },
    setPointer,
    clearPointer() {
      hasPointer = false;
      uniforms.uMouse.value.set(999, 999, 0);
    },
    setTier(idx) {
      const nt = TIERS[idx] ?? TIERS[TIERS.length - 1]!;
      active = Math.min(count, nt.count);
      geo.setDrawRange(0, active);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nt.dpr));
      uniforms.uDpr.value = renderer.getPixelRatio();
      uniforms.uSize.value = 700 / Math.sqrt(active);
    },
    replaceTarget(which, data) {
      const attr = geo.getAttribute(`aP${which}`) as BufferAttribute;
      (attr.array as Float32Array).set(data);
      attr.needsUpdate = true;
    },
    resize,
    unitsPerPixel,
    visibleSize() {
      const upp = unitsPerPixel();
      return { w: W * upp, h: H * upp };
    },
    frame,
    dispose() {
      geo.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
