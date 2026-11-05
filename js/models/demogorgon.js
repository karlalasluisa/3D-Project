import * as THREE from 'three';
import { V, mat, bone, loft, fbm, lerp, smoothstep, canvasTex, softSprite } from '../utils.js';

const SKIN = 0x3b2a2c, FLESH = 0xa02634, BONE = 0xcfc3a8;
const N_PET = 5, HINGE_R = 0.17, HEAD_POS = [0, 2.42, 0.12];

/** Textura de rugosidad para la piel húmeda (solo bump, en escala de grises). */
function skinBump(rx, ry) {
  const t = canvasTex(256, 256, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 0.45 * fbm(x / 22, y / 22, 4) + 0.55 * fbm(x / 6 + 40, y / 6, 3);
      const c = Math.floor(80 + v * 160), i = (y * w + x) * 4;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = c; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}

/** Un pétalo: lámina curva con forma de hoja. Base en el origen, crece hacia +Y, abomba hacia +X. */
function petalGeo(L, W) {
  const nu = 16, nv = 10, pos = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, w = W * Math.pow(Math.max(0, Math.sin(Math.PI * (0.1 + 0.9 * u))), 0.8);
    for (let j = 0; j <= nv; j++) {
      const v = (j / nv) * 2 - 1;
      pos.push(0.2 * Math.sin(Math.PI * Math.min(1, u * 1.05)) - 0.45 * v * v * w * (0.4 + u), L * u, v * w);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };

  const bump = skinBump(3, 3);
  const skin = new THREE.MeshPhysicalMaterial({ color: SKIN, bumpMap: bump, bumpScale: 3, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const inner = new THREE.MeshStandardMaterial({ color: FLESH, emissive: 0x5a0a12, emissiveIntensity: 0.7, roughness: 0.45, side: THREE.BackSide });
  const boneM = mat(BONE, { roughness: 0.45 });

  /* ---- torso, cuello y columna ---- */
  const torsoC = new THREE.CatmullRomCurve3([V(0, 1.3, 0), V(0, 1.75, 0.04), V(0, 2.1, 0.1), V(0, 2.32, 0.14)]);
  const neckC = new THREE.CatmullRomCurve3([V(0, 2.25, 0.12), V(0, 2.38, 0.14), V(0, 2.5, 0.14)]);
  const torso = new THREE.Group();
  const tm = new THREE.Mesh(loft(torsoC, (u) => 0.15 + 0.13 * Math.sin(Math.PI * (0.15 + 0.7 * u)), 40, 20), skin); tm.scale.z = 0.72;
  torso.add(tm, new THREE.Mesh(loft(neckC, () => 0.1, 10, 12), skin));
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), skin); pelvis.position.set(0, 1.3, 0); pelvis.scale.set(1, 0.8, 0.8); torso.add(pelvis);
  [-1, 1].forEach((s) => { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skin); sh.position.set(s * 0.3, 2.22, 0.04); torso.add(sh); });
  const spine = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.14, 5), boneM, 14), d = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const u = 0.05 + 0.9 * (i / 13), p = torsoC.getPointAt(u);
    d.position.set(0, p.y, p.z - 0.2 * 0.72 - 0.03); d.rotation.set(-1.2, 0, 0); d.scale.setScalar(1 - Math.abs(u - 0.5) * 0.5); d.updateMatrix(); spine.setMatrixAt(i, d.matrix);
  }
  torso.add(spine);
  add(torso, {
    id: 'torso', name: 'Torso y columna', explode: [0, 0.25, 0], anchor: [0, 1.85, 0.2], radius: 1.1, dist: 5,
    desc: 'Un tronco delgado y larguísimo, de piel gris oscura y húmeda, con una columna de vértebras que asoma a lo largo de la espalda. Su silueta recuerda a la de un humano estirado.',
    facts: ['La piel brilla como si estuviera cubierta de mucosidad, un rasgo típico de criaturas pensadas para el subsuelo.', 'En la serie se ve una constitución casi esquelética: muy alta y de proporciones imposibles.', 'El diseño parte de un actor real dentro de un traje, no solo de gráficos por ordenador.'],
    fun: 'La criatura de la primera temporada la interpretó el actor y contorsionista Mark Steger, con un traje y la cabeza completada digitalmente.',
  });

  /* ---- piernas digitígradas ---- */
  const legs = new THREE.Group();
  [-1, 1].forEach((s) => {
    const hip = V(s * 0.17, 1.28, 0), knee = V(s * 0.22, 0.78, 0.24), ank = V(s * 0.22, 0.38, -0.1), toe = V(s * 0.22, 0.05, 0.2);
    legs.add(bone(hip, knee, 0.15, 0.1, skin), bone(knee, ank, 0.1, 0.06, skin), bone(ank, toe, 0.06, 0.05, skin, 8));
    [knee, ank].forEach((p, i) => { const j = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.065 : 0.1, 12, 10), skin); j.position.copy(p); legs.add(j); });
    for (let k = -1; k <= 1; k++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2, 6), boneM); c.position.set(s * 0.22 + k * 0.045, 0.04, 0.3); c.rotation.x = Math.PI / 2 - 0.1; legs.add(c);
    }
  });
  add(legs, {
    id: 'piernas', name: 'Piernas', explode: [0, -0.7, 0], anchor: [0.22, 0.65, 0.1], radius: 1.0, dist: 4.4,
    desc: 'Piernas digitígradas: apoya solo los dedos, y la rodilla que se ve apunta hacia delante mientras el tobillo queda atrás, como en un felino o un perro.',
    facts: ['Este tipo de pata favorece las carreras cortas y los saltos de emboscada.', 'Las uñas son largas y oscuras para clavarse en terreno blando.'],
    fun: 'Caminan así muchos animales reales: gatos, perros, caballos y aves apoyan los dedos, no la planta entera.',
  });

  /* ---- brazos con garras ---- */
  const arms = new THREE.Group(), armG = [];
  [-1, 1].forEach((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.3, 2.22, 0.04);
    const E = V(s * 0.1, -0.7, 0.14), W = V(s * 0.16, -1.35, 0.32);
    a.add(bone(V(), E, 0.085, 0.06, skin), bone(E, W, 0.06, 0.04, skin));
    const el = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), skin); el.position.copy(E); a.add(el);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skin); palm.position.copy(W).add(V(0, -0.05, 0.02)); palm.scale.set(1, 1.1, 0.8); a.add(palm);
    for (let i = -1.5; i <= 1.5; i++) {
      const base = V(W.x + i * 0.04, W.y - 0.1, W.z + 0.02), tip = base.clone().add(V(i * 0.03, -0.3, 0.08));
      a.add(bone(base, tip, 0.022, 0.01, skin, 6));
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.1, 5), boneM); claw.position.copy(tip).add(V(i * 0.008, -0.045, 0.012)); claw.rotation.x = Math.PI + 0.25; a.add(claw);
    }
    arms.add(a); armG.push(a);
  });
  add(arms, {
    id: 'brazos', name: 'Brazos y garras', explode: [0, -0.2, 0.9], anchor: [0.5, 1.2, 0.35], radius: 1.1, dist: 4.4,
    desc: 'Brazos larguísimos que llegan casi hasta las rodillas, acabados en manos de cuatro dedos con garras afiladas. Cuelgan relajados hasta el momento del ataque.',
    facts: ['Las garras sirven para arrastrar y sujetar a la presa mientras la boca se abre.', 'Los dedos son más largos que la palma, lo que da un alcance enorme.'],
    fun: 'Muchas criaturas de terror usan brazos desproporcionados porque el cerebro humano los lee como "antinaturales".',
  });

  /* ---- cabeza: pétalos + boca (mismo pivote) ---- */
  const petalsG = new THREE.Group(), mouthG = new THREE.Group(), hinges = [], pg = petalGeo(1.0, 0.26);
  [petalsG, mouthG].forEach((g) => g.position.set(...HEAD_POS));
  for (let k = 0; k < N_PET; k++) {
    const pivot = new THREE.Group(); pivot.rotation.y = -(k / N_PET) * Math.PI * 2;
    const hinge = new THREE.Group(); hinge.position.set(HINGE_R, 0.02, 0);
    hinge.add(new THREE.Mesh(pg, skin), new THREE.Mesh(pg, inner));
    pivot.add(hinge); petalsG.add(pivot); hinges.push(hinge);
  }
  add(petalsG, {
    id: 'petalos', name: 'Pétalos (cabeza-flor)', explode: [0, 0.9, 0], anchor: [0, 3.0, 0.25], radius: 0.9, dist: 4.2,
    desc: 'No tiene ojos, nariz ni orejas. Su cabeza es un bulbo cerrado que se abre en cinco pétalos de carne, como una flor, para dejar ver la boca.',
    facts: ['El exterior es oscuro y liso; el interior, rojo y húmedo, como el de una planta carnívora.', 'Se abre para atacar y se cierra para ocultarse: es su "cara" de defensa.', 'En la primera temporada se siente atraído por la sangre: huele a la presa antes que verla.'],
    fun: 'Su diseño mezcla una flor, una planta carnívora y una boca de lamprea: tres cosas que no esperarías juntas en un rostro.',
  });

  /* boca: garganta, anillos de dientes y luz interior */
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.06, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a0610, emissive: 0xff2a14, emissiveIntensity: 1.1, side: THREE.BackSide }));
  throat.position.y = -0.05;
  const NT = 16 + 24 + 32, teeth = new THREE.InstancedMesh(new THREE.ConeGeometry(0.02, 0.15, 6), mat(0xf0e6cc, { roughness: 0.35 }), NT);
  let n = 0;
  [[0.1, 16, 0.07], [0.17, 24, 0.04], [0.24, 32, 0.0]].forEach(([r, c, y], ri) => {
    for (let i = 0; i < c; i++, n++) {
      const a = (i / c) * Math.PI * 2 + ri * 0.2, dir = V(-Math.cos(a) * 0.5, 1, -Math.sin(a) * 0.5).normalize();
      d.position.set(Math.cos(a) * r, y, Math.sin(a) * r); d.quaternion.setFromUnitVectors(V(0, 1, 0), dir); d.scale.setScalar(1 - ri * 0.12); d.updateMatrix(); teeth.setMatrixAt(n, d.matrix);
    }
  });
  const glow = new THREE.PointLight(0xff3020, 0, 5); glow.position.set(0, 0.25, 0);
  mouthG.add(throat, teeth, glow);
  add(mouthG, {
    id: 'boca', name: 'Boca y dientes', explode: [0, 0.35, 0], anchor: [0, 2.55, 0.2], radius: 0.6, dist: 3.2, view: [0, 0.8, 1],
    desc: 'Una garganta profunda rodeada de anillos concéntricos de dientes afilados que apuntan hacia dentro. Lo que entra, no puede salir.',
    facts: ['Los dientes se disponen en círculos, como en una lamprea o en un gusano de arena.', 'Los anillos exteriores sujetan; los interiores trituran.', 'Solo se ven cuando los pétalos están abiertos (espera unos segundos en la animación).'],
    fun: 'Las lampreas reales tienen una boca circular llena de dientes córneos y se pegan a sus presas para alimentarse.',
  });

  /* ---- esporas del Revés ---- */
  const NS = 280, sp = new Float32Array(NS * 3), seeds = Array.from({ length: NS }, () => ({ x: (Math.random() - 0.5) * 7, z: (Math.random() - 0.5) * 7, y: Math.random() * 5, v: 0.12 + Math.random() * 0.3, f: 0.4 + Math.random(), p: Math.random() * 6.28 }));
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const spores = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.12, map: softSprite(), color: 0xff6a4a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  spores.frustumCulled = false;
  add(spores, {
    id: 'esporas', name: 'Esporas del Revés', explode: [0, 0, 0], anchor: [-1.6, 2.3, 0.8], radius: 2.2, dist: 8,
    desc: 'Partículas que flotan sin caer en el aire del Revés, una dimensión oscura y fría que imita nuestro mundo cubierta de vegetación viscosa.',
    facts: ['En la serie, el aire del Revés está lleno de motas que parecen ceniza o esporas.', 'Los personajes necesitan máscaras para respirar allí.'],
    fun: 'El efecto se parece a la nieve marina de las profundidades: restos orgánicos que caen o flotan lentamente.',
  });

  /* ---- animación ---- */
  function update(t) {
    group.rotation.y = Math.sin(t * 0.3) * 0.18;
    torso.scale.y = 1 + Math.sin(t * 1.3) * 0.012;
    const ph = t % 9, o = smoothstep(1.6, 3.4, ph) * (1 - smoothstep(6.2, 7.8, ph));
    hinges.forEach((h, k) => { h.rotation.z = lerp(0.16, -1.15, o) + Math.sin(t * 3 + k * 1.7) * 0.05 * o; });
    const lean = 0.1 + Math.sin(t * 0.5) * 0.05, sway = Math.sin(t * 0.7) * 0.07;
    [petalsG, mouthG].forEach((g) => g.rotation.set(lean, 0, sway));
    glow.intensity = o * 7;
    armG.forEach((a, i) => { a.rotation.x = Math.sin(t * 0.8 + i * 1.6) * 0.1; a.rotation.z = (i ? -1 : 1) * (0.03 + 0.02 * Math.sin(t * 1.1)); });
    for (let i = 0; i < NS; i++) {
      const s = seeds[i];
      sp[i * 3] = s.x + Math.sin(t * s.f + s.p) * 0.3; sp[i * 3 + 1] = (s.y + t * s.v) % 5; sp[i * 3 + 2] = s.z + Math.cos(t * s.f * 0.8 + s.p) * 0.3;
    }
    sg.attributes.position.needsUpdate = true;
  }
  return { group, parts, update };
}

export default {
  id: 'demogorgon', category: 'criatura', icon: '👹', accent: '#ff4a4a',
  name: 'Demogorgon', latin: 'Criatura de ficción · El Revés',
  summary: 'Depredador humanoide de la serie Stranger Things. Sin rostro, con una cabeza que se abre como una flor para mostrar una boca circular de dientes, caza en un mundo paralelo y oscuro.',
  stats: [['Aparición', 'Stranger Things · 2016'], ['Altura (modelo)', '≈ 3 m'], ['Cabeza', 'Flor de 5 pétalos'], ['Origen', 'El Revés'], ['Sentido clave', 'Olfato (sangre)'], ['Especie', 'Ficticia']],
  curiosities: [
    'El nombre sale del juego de rol Dungeons & Dragons, donde Demogorgon es el "Príncipe de los Demonios": en la serie lo bautizan así los niños.',
    'El nombre es mucho más antiguo: ya aparece en textos de Boccaccio, en la Reina de las Hadas de Spenser y en El paraíso perdido de Milton.',
    'En la primera temporada lo interpretó un actor con traje real, no solo efectos digitales, y eso explica su movimiento tan físico.',
  ],
  env: { bgTop: '#0a0304', bgBottom: '#2b0a0d', fog: '#1a0607', fogDensity: 0.045, bloom: [0.6, 0.6, 0.7], envInt: 0.3, key: 1.4, hemi: 0.3, rim: 2.4, dustR: 9, dustN: 500, floorY: 0, floorR: 6 },
  camera: { pos: [3.4, 2.7, 6.6], target: [0, 1.7, 0], min: 1, max: 22 },
  build,
};
