import * as THREE from "three";

/** Smooth lathe from [y, radius] control points (y descending or ascending). */
export function lathe(points: [number, number][], segments = 20, samples = 24, zScale = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map(([y, r]) => new THREE.Vector3(r, y, 0)));
  const pts = curve.getPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  const g = new THREE.LatheGeometry(pts, segments);
  if (zScale !== 1) g.scale(1, 1, zScale);
  g.computeVertexNormals();
  return g;
}

/** Tapered limb pointing down -Y from the joint, with rounded ends. */
export function limb(rTop: number, rBot: number, len: number, zScale = 1) {
  return lathe(
    [
      [rTop * 0.9, 0.001],
      [rTop * 0.55, rTop * 0.82],
      [0, rTop],
      [-len * 0.35, THREE.MathUtils.lerp(rTop, rBot, 0.3) * 1.03],
      [-len * 0.75, THREE.MathUtils.lerp(rTop, rBot, 0.78)],
      [-len, rBot],
      [-len - rBot * 0.55, rBot * 0.8],
      [-len - rBot * 0.95, 0.001],
    ],
    16,
    22,
    zScale,
  );
}

/** Adds gentle radial folds to cloth geometry; amplitude grows away from `y0`. */
export function addFolds(
  g: THREE.BufferGeometry,
  count: number,
  amp: number,
  y0: number,
  y1: number,
) {
  const p = g.attributes["position"] as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    const k =
      1 + Math.sin(a * count + t * 1.5) * amp * t + Math.sin(a * count * 2.3 + 1) * amp * 0.35 * t;
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Subtle woven fabric texture so cloth reads as material, not plastic. */
export function fabricTexture(base: string, seed = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 128; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`;
    ctx.fillRect(0, y, 128, 1);
  }
  for (let x = 0; x < 128; x += 2) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.025})`;
    ctx.fillRect(x, 0, 1, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
