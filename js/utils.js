import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...o });

/** Cilindro entre dos puntos (hueso). r1 en a, r2 en b. */
export function bone(a, b, r1, r2, material, seg = 12) {
  const d = b.clone().sub(a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, seg), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

/** Tubo con radio variable a lo largo de una curva. */
export function loft(curve, radiusFn, tubular = 64, radial = 16) {
  const g = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = g.attributes.position, c = V(), p = V();
  for (let i = 0; i <= tubular; i++) {
    curve.getPointAt(i / tubular, c);
    const r = radiusFn(i / tubular);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, p.x, p.y, p.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- ruido ---------- */
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
}
export function rand(seed) { // determinista
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---------- texturas ---------- */
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let _soft;
export function softSprite() {
  return _soft ||= canvasTex(64, 64, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}
export function scaleTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#666'; g.fillRect(0, 0, w, h);
    const r = 16;
    for (let row = 0; row < h / (r * 0.9) + 1; row++)
      for (let col = -1; col < w / (r * 2) + 1; col++) {
        const x = col * r * 2 + (row % 2 ? r : 0), y = row * r * 0.9;
        const gr = g.createRadialGradient(x, y - r * 0.25, 2, x, y, r);
        gr.addColorStop(0, '#f2f2f2'); gr.addColorStop(0.7, '#b0b0b0'); gr.addColorStop(1, '#2a2a2a');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
  });
}

/* ---------- engranajes ---------- */
export function gearGeometry(N, rp, m, { depth = 0.18, hole = 0.1, spokes = 0, hub = 0.25, spokeW = 0.14 } = {}) {
  const ro = rp + m * 0.9, rr = rp - m * 1.1, p = (Math.PI * 2) / N;
  const s = new THREE.Shape();
  for (let k = 0; k < N; k++) {
    const a = k * p;
    [[rr, a - p * 0.3], [ro, a - p * 0.15], [ro, a + p * 0.15], [rr, a + p * 0.3], [rr, a + p * 0.5]].forEach(([r, an], i) => {
      const x = r * Math.cos(an), y = r * Math.sin(an);
      k === 0 && i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    });
  }
  s.closePath();
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
  const rin = hole + hub, rout = rr - m * 2.5;
  if (spokes > 0 && rout > rin + 0.1) {
    const g = (0.5 * spokeW) / ((rin + rout) / 2);
    for (let i = 0; i < spokes; i++) {
      const a0 = (Math.PI * 2 * i) / spokes + g, a1 = (Math.PI * 2 * (i + 1)) / spokes - g;
      const w = new THREE.Path();
      w.moveTo(rin * Math.cos(a0), rin * Math.sin(a0));
      w.lineTo(rout * Math.cos(a0), rout * Math.sin(a0));
      w.absarc(0, 0, rout, a0, a1, false);
      w.lineTo(rin * Math.cos(a1), rin * Math.sin(a1));
      w.absarc(0, 0, rin, a1, a0, true);
      s.holes.push(w);
    }
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 16 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}
export function spiralCurve(r0, r1, turns, n = 220) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t;
    pts.push(V(r * Math.cos(a), r * Math.sin(a), 0));
  }
  return new THREE.CatmullRomCurve3(pts);
}
