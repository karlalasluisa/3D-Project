import * as THREE from 'three';
import { V, mat, bone, canvasTex } from '../utils.js';

function foreShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.1);
  s.bezierCurveTo(0.3, 0.9, 1.2, 1.1, 1.9, 0.85);
  s.bezierCurveTo(2.0, 0.6, 1.7, 0.1, 1.2, -0.35);
  s.bezierCurveTo(0.8, -0.5, 0.3, -0.35, 0, -0.1);
  return s;
}
function hindShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.05);
  s.bezierCurveTo(0.6, 0.05, 1.3, -0.2, 1.35, -0.7);
  s.bezierCurveTo(1.35, -1.2, 0.8, -1.5, 0.4, -1.3);
  s.bezierCurveTo(0.1, -1.15, 0, -0.8, 0, -0.6);
  return s;
}

/** Geometría + textura de ala con venas, borde negro y puntos blancos. */
function wing(shape, hind) {
  const pts = shape.getPoints(64);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  pts.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  const W = x1 - x0, H = y1 - y0;
  const geo = new THREE.ShapeGeometry(shape, 24);
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x0) / W, (pos.getY(i) - y0) / H);
  const SZ = 512, px = (p) => [((p.x - x0) / W) * SZ, (1 - (p.y - y0) / H) * SZ];
  const tex = canvasTex(SZ, SZ, (g) => {
    g.clearRect(0, 0, SZ, SZ);
    g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...px(p))); g.closePath();
    const gr = g.createLinearGradient(0, 0, SZ, SZ * (hind ? 1 : 0.2));
    gr.addColorStop(0, '#f08a1c'); gr.addColorStop(0.6, '#e8650f'); gr.addColorStop(1, '#f5a425');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    const o = px(pts[0]);
    g.strokeStyle = '#150b06'; g.lineCap = 'round';
    for (let i = 4; i < pts.length - 4; i += 5) {
      const [x, y] = px(pts[i]); g.lineWidth = 3 + (i % 3);
      g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(o[0] + (x - o[0]) * 0.96, o[1] + (y - o[1]) * 0.96); g.stroke();
    }
    g.lineWidth = 46; g.stroke(new Path2D((() => { let d = ''; pts.forEach((p, i) => { const [x, y] = px(p); d += (i ? 'L' : 'M') + x + ' ' + y; }); return d + 'Z'; })()));
    const cx = SZ * 0.5, cy = SZ * 0.5;
    g.fillStyle = '#fff8ec';
    for (let i = 0; i < pts.length; i += 2) {
      const [x, y] = px(pts[i]), k = 0.07, rr = 3 + (i % 3);
      g.beginPath(); g.arc(x + (cx - x) * k, y + (cy - y) * k, rr, 0, 7); g.fill();
      if (i % 4 === 0) { g.beginPath(); g.arc(x + (cx - x) * 0.14, y + (cy - y) * 0.14, 2.4, 0, 7); g.fill(); }
    }
    g.restore();
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.28, side: THREE.DoubleSide, roughness: 0.75, transparent: true, alphaTest: 0.02 });
  const mesh = new THREE.Mesh(geo.rotateX(-Math.PI / 2), m);
  return mesh;
}

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };
  const PIV_Z = -0.15;

  const pair = () => {
    const g = new THREE.Group(), L = new THREE.Group(), R = new THREE.Group();
    R.scale.x = -1; L.position.z = R.position.z = PIV_Z; g.add(L, R); return { g, L, R };
  };

  const fw = pair();
  fw.L.add(wing(foreShape(), false)); fw.R.add(wing(foreShape(), false));
  add(fw.g, {
    id: 'anteriores', name: 'Alas anteriores', explode: [0, 0.9, -0.2], view: [0.2, 1.1, 0.6], dist: 5.6,
    desc: 'Las alas delanteras, más largas y puntiagudas, generan la mayor parte del empuje. Su color naranja con venas negras es una advertencia: "soy tóxica".',
    facts: ['Están recubiertas por miles de escamas microscópicas solapadas como tejas.', 'El naranja vivo es aposematismo: avisa a los depredadores de que sabe mal.', 'Los puntos blancos del borde son un patrón único de la especie.'],
    fun: 'El virrey, una mariposa inofensiva, imita este diseño para aprovechar su fama de tóxica.',
  });

  const hw = pair();
  hw.L.add(wing(hindShape(), true)); hw.R.add(wing(hindShape(), true));
  add(hw.g, {
    id: 'posteriores', name: 'Alas posteriores', explode: [0, 0.4, 0.9], view: [0.2, 1.1, -0.6], dist: 5.2,
    desc: 'Alas traseras, más redondeadas. Dan estabilidad y maniobrabilidad, y ayudan a planear durante las largas migraciones.',
    facts: ['Se mueven solapadas con las delanteras, como una sola superficie.', 'En los machos, una mancha negra sobre una vena guarda glándulas de feromonas.'],
    fun: 'Los monarcas pueden planear aprovechando corrientes térmicas para ahorrar energía en su migración.',
  });

  /* cabeza */
  const head = new THREE.Group();
  const hm = mat(0x1b1512, { roughness: 0.5 });
  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), hm); head.add(hs);
  const eyeM = mat(0x050505, { roughness: 0.08, metalness: 0.3 });
  [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), eyeM); e.position.set(s * 0.09, 0.03, -0.06); head.add(e); });
  const probo = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 24, Math.PI * 1.7), mat(0x3b2a1e));
  probo.position.set(0, -0.06, -0.12); head.add(probo);
  head.position.set(0, 0, -0.5);
  add(head, {
    id: 'cabeza', name: 'Cabeza y ojos', explode: [0, 0.3, -1.1], dist: 2.6,
    desc: 'Dos grandes ojos compuestos, formados por miles de omatidios, detectan movimiento y colores —incluido el ultravioleta— mejor que los nuestros.',
    facts: ['La probóscide es un tubo enrollado que se despliega para libar néctar.', 'Ve el ultravioleta, invisible para el ojo humano.'],
    fun: 'Una probóscide completamente extendida es más larga que su cabeza muchas veces.',
  });

  /* antenas */
  const ant = new THREE.Group(), aM = mat(0x161110);
  [-1, 1].forEach((s) => {
    const c = new THREE.CatmullRomCurve3([V(s * 0.04, 0.06, -0.58), V(s * 0.14, 0.3, -0.85), V(s * 0.3, 0.5, -1.2), V(s * 0.38, 0.55, -1.38)]);
    ant.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.012, 6), aM));
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), aM); k.position.copy(c.getPoint(1)); k.scale.z = 1.8; ant.add(k);
  });
  add(ant, {
    id: 'antenas', name: 'Antenas', explode: [0, 0.7, -1.4], dist: 2.8,
    desc: 'Cargadas de receptores olfativos y táctiles. Rematan en una pequeña maza y funcionan como nariz del insecto.',
    facts: ['Detectan olores a distancia: flores, plantas hospedadoras y feromonas.', 'Contienen relojes circadianos que le permiten corregir la hora al orientarse por el Sol.'],
    fun: 'Su brújula solar usa el reloj de las antenas para mantener el rumbo hacia México a lo largo del día.',
  });

  /* tórax y patas */
  const th = new THREE.Group();
  const tm = mat(0x1b1512, { roughness: 0.55 }), wm = mat(0xfff6e6);
  const thx = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), tm); thx.scale.set(1, 1, 1.5); thx.position.z = -0.2; th.add(thx);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.28, d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), wm);
    d.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.16 + 0.02, -0.2 + (i % 3 - 1) * 0.1); th.add(d);
  }
  const lm = mat(0x24190f);
  [-1, 1].forEach((s) => [0, 1, 2].forEach((i) => th.add(bone(V(s * 0.07, -0.1, -0.3 + i * 0.1), V(s * (0.28 + i * 0.03), -0.4, -0.38 + i * 0.12), 0.012, 0.006, lm, 5))));
  add(th, {
    id: 'torax', name: 'Tórax y patas', explode: [0, -0.9, -0.2], dist: 3.2,
    desc: 'El centro motor: alberga los músculos del vuelo y sostiene las alas y las seis patas.',
    facts: ['Las patas delanteras son pequeñas y plegadas: camina sobre cuatro.', 'Tiene receptores del gusto en las patas: "saborea" las plantas al posarse.'],
    fun: 'Sus patas "prueban" la hoja del algodoncillo para decidir dónde poner los huevos.',
  });

  /* abdomen */
  const abd = new THREE.Group();
  const am = mat(0x1b1512, { roughness: 0.6 });
  const ab = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.95, 8, 18).rotateX(Math.PI / 2), am); ab.position.z = 0.65; abd.add(ab);
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), wm); d.position.set((i % 2 ? 1 : -1) * 0.075, 0.03, 0.25 + i * 0.1); abd.add(d); }
  add(abd, {
    id: 'abdomen', name: 'Abdomen', explode: [0, -0.4, 1.2], dist: 3.4,
    desc: 'Segmentado y flexible, contiene el aparato digestivo, el corazón dorsal y los órganos reproductores.',
    facts: ['Respira a través de pequeñas aberturas laterales llamadas espiráculos.', 'Su corazón es un tubo que recorre el dorso.'],
    fun: 'Un monarca pesa apenas medio gramo, menos que un clip, y aun así cruza un continente.',
  });

  function update(t) {
    const a = 0.3 + 0.78 * Math.sin(t * 3.4), b = 0.28 + 0.7 * Math.sin(t * 3.4 - 0.5);
    fw.L.rotation.z = a; fw.R.rotation.z = -a; hw.L.rotation.z = b; hw.R.rotation.z = -b;
    group.position.y = Math.sin(t * 3.4 + 1.2) * 0.12 + Math.sin(t * 0.8) * 0.2;
  }
  return { group, parts, update };
}

export default {
  id: 'monarca', category: 'animal', icon: '🦋', accent: '#ffa43a',
  name: 'Mariposa monarca', latin: 'Danaus plexippus · Lepidoptera',
  summary: 'Pequeña viajera capaz de recorrer miles de kilómetros desde Canadá hasta los bosques de oyamel de México. Sus alas naranjas advierten de su toxicidad.',
  stats: [['Envergadura', '9 – 10 cm'], ['Peso', '≈ 0,5 g'], ['Migración', 'hasta 4 000 km'], ['Vida', '2 – 6 semanas*'], ['Alimento', 'Algodoncillo'], ['Metamorfosis', 'Completa']],
  curiosities: [
    '*La generación migratoria, llamada "Matusalén", vive hasta 8–9 meses, mucho más que las demás.',
    'De oruga acumula toxinas (cardenólidos) del algodoncillo, y las conserva de adulta.',
    'Ninguna mariposa individual hace el viaje completo de ida y vuelta: lo completan varias generaciones.',
  ],
  env: { bgTop: '#0b1020', bgBottom: '#3b2a3c', fog: '#2c2236', fogDensity: 0.02, bloom: [0.35, 0.5, 0.9], envInt: 0.7, key: 2.4, hemi: 0.8, dustR: 10, dustN: 260, floorY: -2.4, floorR: 6 },
  camera: { pos: [0, 4.2, 7.2], target: [0, 0, 0], min: 1, max: 20 },
  build,
};
