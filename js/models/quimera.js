import * as THREE from 'three';
import { V, mat, bone, loft, canvasTex, softSprite } from '../utils.js';

const FUR = 0xc08a3e, MANE = 0x6b3d18, GOAT = 0xd8d0c0, HORN = 0x4a3b2a, GOLD = 0xffcc33;
const LION_POS = V(1.62, 1.88, 0), GOAT_POS = V(0.62, 2.66, 0.04), TAIL_ROOT = V(-1.05, 1.25, 0);
const N_SNAKE = 72;

/** Textura de pelo: trazos finos casi verticales (se usa como mapa y como bump). */
function furTex(rx, ry) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = 5 + Math.random() * 9, c = 90 + Math.random() * 150;
      g.strokeStyle = `rgb(${c},${c},${c})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y + l); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}

function lionLeg(hip, knee, ank, paw, m, clawM) {
  const g = new THREE.Group();
  g.add(bone(hip, knee, 0.19, 0.13, m, 12), bone(knee, ank, 0.13, 0.085, m, 10), bone(ank, paw, 0.085, 0.08, m, 8));
  const kn = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), m); kn.position.copy(knee); g.add(kn);
  const pw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), m); pw.scale.set(1.35, 0.6, 1); pw.position.set(paw.x + 0.08, 0.075, paw.z); g.add(pw);
  for (let i = -1; i <= 1; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 6), clawM); c.position.set(paw.x + 0.25, 0.06, paw.z + i * 0.05); c.rotation.z = -Math.PI / 2; g.add(c);
  }
  return g;
}

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };
  const fur = furTex(4, 2);
  const furM = new THREE.MeshStandardMaterial({ color: FUR, map: fur, bumpMap: fur, bumpScale: 1.5, roughness: 0.85 });
  const goatM = new THREE.MeshStandardMaterial({ color: GOAT, map: fur, bumpMap: fur, bumpScale: 1.2, roughness: 0.9 });
  const boneM = mat(0xe8dfc6, { roughness: 0.5 }), hornM = mat(HORN, { roughness: 0.6 }), darkM = mat(0x1a100a, { roughness: 0.4 });
  const eyeM = new THREE.MeshStandardMaterial({ color: GOLD, emissive: 0xffaa00, emissiveIntensity: 1.5 });
  const d = new THREE.Object3D();

  /* ---- cuerpo de león ---- */
  const torsoC = new THREE.CatmullRomCurve3([V(-1.05, 1.25, 0), V(-0.3, 1.32, 0), V(0.4, 1.38, 0), V(1.0, 1.42, 0)]);
  const body = new THREE.Group();
  body.add(new THREE.Mesh(loft(torsoC, (u) => 0.3 + 0.2 * Math.sin(Math.PI * (0.1 + 0.7 * u)), 40, 24), furM));
  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), furM); rump.position.copy(torsoC.getPoint(0)); body.add(rump);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 16), furM); chest.position.copy(torsoC.getPoint(1)); body.add(chest);
  const neckC = new THREE.CatmullRomCurve3([V(0.95, 1.42, 0), V(1.25, 1.62, 0), V(1.55, 1.8, 0)]);
  body.add(new THREE.Mesh(loft(neckC, () => 0.29, 16, 16), furM));
  add(body, {
    id: 'cuerpo', name: 'Cuerpo de león', explode: [0, 0.3, 0], anchor: [-0.1, 1.45, 0.5], radius: 1.8, dist: 8,
    desc: 'La parte principal de la Quimera es un león adulto: tórax profundo, lomo fuerte y cuartos traseros musculosos. De este tronco salen la segunda cabeza y la cola.',
    facts: ['Los leones concentran su fuerza en el pecho y los hombros, útiles para derribar presas grandes.', 'En el mito el cuerpo es el del león, que da nombre a la parte delantera de la criatura.', 'El pelaje tostado es el color clásico del león en el arte griego y etrusco.'],
    fun: 'Un león macho real puede pesar más de 190 kg y su rugido se oye a unos 8 km de distancia.',
  });

  /* ---- patas ---- */
  const lm = new THREE.MeshStandardMaterial({ color: FUR, map: fur, bumpMap: fur, bumpScale: 1.2, roughness: 0.85 });
  const legs = new THREE.Group();
  [-1, 1].forEach((s) => {
    legs.add(lionLeg(V(0.8, 1.15, s * 0.38), V(0.7, 0.65, s * 0.42), V(0.85, 0.3, s * 0.4), V(0.95, 0.08, s * 0.4), lm, boneM));
    legs.add(lionLeg(V(-0.85, 1.2, s * 0.35), V(-0.55, 0.8, s * 0.4), V(-1.0, 0.45, s * 0.38), V(-0.8, 0.08, s * 0.38), lm, boneM));
  });
  add(legs, {
    id: 'patas', name: 'Patas y garras', explode: [0, -0.5, 0], anchor: [0.9, 0.5, 0.4], radius: 2, dist: 8,
    desc: 'Cuatro patas de felino con almohadillas y garras retráctiles. Las delanteras, más anchas, sujetan a la presa; las traseras, con la rodilla muy flexionada, impulsan los saltos.',
    facts: ['Los leones caminan sobre los dedos (digitigrados) y por eso son silenciosos.', 'Cada garra se esconde en una vaina y solo sale para atacar, así no se desafila.'],
    fun: 'En la leyenda, ni la espada de un héroe podía herir al león de la Quimera sin ayuda de los dioses.',
  });

  /* ---- cabeza de león con melena ---- */
  const lion = new THREE.Group(); lion.position.copy(LION_POS);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), furM); skull.scale.set(1.1, 0.95, 1); lion.add(skull);
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), furM); muz.scale.set(1.35, 0.8, 1.05); muz.position.set(0.36, -0.1, 0); lion.add(muz);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), darkM); nose.position.set(0.6, -0.02, 0); nose.scale.set(0.9, 0.7, 1.2); lion.add(nose);
  const jawG = new THREE.Group(); jawG.position.set(0.12, -0.2, 0);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), furM); jaw.scale.set(1.3, 0.38, 0.85); jaw.position.set(0.25, -0.02, 0); jawG.add(jaw);
  [-1, 1].forEach((s) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 6), boneM); f.position.set(0.44, 0.06, s * 0.09); jawG.add(f); });
  lion.add(jawG);
  [-1, 1].forEach((s) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.13, 6), boneM); f.rotation.z = Math.PI; f.position.set(0.5, -0.17, s * 0.1); lion.add(f);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), eyeM); e.position.set(0.3, 0.1, s * 0.2); lion.add(e);
    const br = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), furM); br.scale.set(1.5, 0.5, 1); br.position.set(0.3, 0.18, s * 0.2); lion.add(br);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), furM); ear.scale.set(0.6, 1, 1); ear.position.set(-0.08, 0.32, s * 0.26); lion.add(ear);
  });
  /* melena: conos que salen radialmente alrededor del cuello, salvo por delante (la cara) */
  const NM = 230, mane = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.6, 6), mat(0xffffff, { roughness: 0.9 }), NM), mc = new THREE.Color();
  let mi = 0;
  for (let i = 0; mi < NM && i < NM * 3; i++) {
    const y = 1 - (2 * (i + 0.5)) / (NM * 3), r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const dir = V(Math.cos(a) * r, y, Math.sin(a) * r);
    if (dir.x > 0.5) continue;
    dir.y -= 0.12; dir.normalize();
    const L = dir.x < 0 ? 1.3 + Math.random() * 0.5 : 1 + Math.random() * 0.3;
    d.position.set(-0.12, -0.1, 0).addScaledVector(dir, 0.3 + 0.12 * L); d.quaternion.setFromUnitVectors(V(0, 1, 0), dir); d.scale.set(1, L, 1); d.updateMatrix();
    mane.setMatrixAt(mi, d.matrix); mane.setColorAt(mi, mc.set(MANE).multiplyScalar(0.7 + Math.random() * 0.7)); mi++;
  }
  mane.count = mi; mane.instanceColor.needsUpdate = true; lion.add(mane);
  add(lion, {
    id: 'leon', name: 'Cabeza de león', explode: [0.9, 0.3, 0], anchor: [1.9, 1.9, 0.3], radius: 1.0, dist: 4.4,
    desc: 'La cabeza principal: melena densa de macho adulto, mandíbula potente y colmillos largos. Es la que lanza el aliento de fuego en la leyenda.',
    facts: ['La melena protege el cuello en las peleas y sirve de señal de fuerza ante rivales y hembras.', 'Una melena oscura suele indicar un macho más sano y con más testosterona.', 'En el mito, es la cabeza que va por delante: lo primero que ve el héroe.'],
    fun: 'Hoy "quimera" también significa en español una ilusión o fantasía imposible de alcanzar.',
  });

  /* ---- cabeza de cabra en el lomo ---- */
  const goat = new THREE.Group();
  const gC = new THREE.CatmullRomCurve3([V(0.15, 1.55, 0.02), V(0.3, 1.95, 0.06), V(0.45, 2.3, 0.05), V(0.58, 2.58, 0.04)]);
  goat.add(new THREE.Mesh(loft(gC, (u) => 0.15 - 0.05 * u, 24, 14), goatM));
  const gh = new THREE.Group(); gh.position.copy(GOAT_POS);
  const gs = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), goatM); gs.scale.set(1.2, 1, 0.85); gh.add(gs);
  const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 0.35, 14).rotateZ(-Math.PI / 2), goatM); sn.position.set(0.28, -0.05, 0); sn.scale.z = 0.8; gh.add(sn);
  const gn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), darkM); gn.position.set(0.46, -0.04, 0); gn.scale.set(0.8, 0.7, 1.1); gh.add(gn);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 8), goatM); beard.rotation.z = Math.PI; beard.position.set(0.3, -0.22, 0); gh.add(beard);
  const gjaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), goatM); gjaw.scale.set(1.5, 0.45, 0.8); gjaw.position.set(0.25, -0.12, 0); gh.add(gjaw);
  const gEars = [];
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), goatM); e.scale.set(0.9, 0.25, 1.4); e.position.set(-0.05, 0.05, s * 0.23); e.rotation.x = s * 0.5; gh.add(e); gEars.push(e);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe6c34a, emissive: 0x6a5410, emissiveIntensity: 0.6 })); eye.position.set(0.16, 0.07, s * 0.14); gh.add(eye);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.055), darkM); pupil.position.set(0.195, 0.07, s * 0.14); pupil.rotation.y = s * 0.5; gh.add(pupil);
    const hc = new THREE.CatmullRomCurve3([V(0, 0.12, s * 0.07), V(-0.12, 0.34, s * 0.1), V(-0.35, 0.5, s * 0.13), V(-0.52, 0.42, s * 0.14)]);
    gh.add(new THREE.Mesh(loft(hc, (u) => 0.05 * (1 - u) + 0.006, 24, 10), hornM));
  });
  goat.add(gh);
  add(goat, {
    id: 'cabra', name: 'Cabeza de cabra', explode: [-0.2, 1.0, 0], anchor: [0.7, 2.7, 0.2], radius: 0.8, dist: 3.6,
    desc: 'Una segunda cabeza brota del lomo del león, a la altura de las paletillas. Tiene cuernos curvos, barba y pupilas rectangulares, y mastica sin parar.',
    facts: ['Las cabras tienen pupilas horizontales que les dan un campo de visión casi panorámico para detectar depredadores.', 'En el mito, la cabra ocupa la zona del medio del cuerpo: "león delante, cabra en medio, serpiente detrás".', 'La cabra era un símbolo de fertilidad y de lo salvaje en Grecia.'],
    fun: 'La palabra "quimera" viene del griego khímaira, que significa literalmente "cabra joven".',
  });

  /* ---- cola de serpiente (dinámica) ---- */
  const tailPt = (s, t, out) => out.set(
    TAIL_ROOT.x - 2.3 * s, TAIL_ROOT.y + 1.55 * Math.sin(Math.PI * 0.88 * s) + 0.08 * Math.sin(t * 1.6 + s * 5) * s, Math.sin(t * 2 - s * 7) * 0.32 * s);
  const sMat = mat(0xffffff, { roughness: 0.45, metalness: 0.1 }), sc = new THREE.Color();
  const snake = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), sMat, N_SNAKE);
  for (let i = 0; i < N_SNAKE; i++) snake.setColorAt(i, sc.set(i % 6 < 3 ? 0x4f7a3a : 0x2f4a26));
  snake.instanceColor.needsUpdate = true; snake.frustumCulled = false;
  const sh = new THREE.Group();
  const sk = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat(0x3d6130, { roughness: 0.4 })); sk.scale.set(1.5, 0.8, 1); sh.add(sk);
  const redEye = new THREE.MeshStandardMaterial({ color: 0xff3a1f, emissive: 0xff2200, emissiveIntensity: 2 });
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), redEye); e.position.set(0.1, 0.05, s * 0.07); sh.add(e);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 5), boneM); f.rotation.z = Math.PI; f.position.set(0.15, -0.08, s * 0.04); sh.add(f);
  });
  const tongue = new THREE.Group(); tongue.position.set(0.17, -0.02, 0);
  [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.16, 4).rotateZ(-Math.PI / 2), mat(0xd01030, { emissive: 0x700010, emissiveIntensity: 0.6 })); c.position.set(0.08, 0, s * 0.015); c.rotation.y = s * 0.3; tongue.add(c); });
  sh.add(tongue);
  const snakeG = new THREE.Group(); snakeG.add(snake, sh);
  add(snakeG, {
    id: 'serpiente', name: 'Cola de serpiente', explode: [-1.2, 0.4, 0], anchor: [-3.1, 2.0, 0.2], radius: 1.8, dist: 6,
    desc: 'En lugar de cola de león, termina en una serpiente viva que se arquea sobre el lomo, silba y muerde. Tiene vida propia: ataca por su cuenta.',
    facts: ['La lengua bífida recoge partículas del aire y las lleva al órgano de Jacobson, en el paladar, para "oler" a la presa.', 'En las representaciones antiguas la serpiente muerde al león o a la cabra: la criatura se pelea consigo misma.', 'Algunas versiones tardías sustituyen la serpiente por la cabeza de un dragón.'],
    fun: 'La famosa Quimera de Arezzo, de bronce etrusco (hacia el 400 a. C.), tiene la cola de serpiente restaurada en el siglo XVIII.',
  });

  /* ---- fuego ---- */
  const NF = 240, fp = new Float32Array(NF * 3), fc = new Float32Array(NF * 3), seeds = Array.from({ length: NF }, () => [Math.random(), Math.random() - 0.5, Math.random() - 0.5]);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  const fire = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.55, map: softSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fire.frustumCulled = false;
  const mouth = V(LION_POS.x + 0.82, LION_POS.y - 0.2, 0), fl = new THREE.PointLight(0xff8a3a, 0, 14); fl.position.set(mouth.x + 1.2, mouth.y, 0);
  const fireG = new THREE.Group(); fireG.add(fire, fl);
  add(fireG, {
    id: 'fuego', name: 'Aliento de fuego', explode: [1.2, 0.3, 0], anchorFn: (o) => o.set(mouth.x + 1.4, mouth.y, 0).add(fireG.position), radius: 1.5, dist: 5,
    desc: 'Una llamarada brota de las fauces del león. En la leyenda es la señal de la bestia: no hay forma de acercarse sin quemarse.',
    facts: ['Según el mito, Belerofonte la venció a lomos de Pegaso, disparando desde el aire con una lanza de punta de plomo.', 'En relatos posteriores, el plomo se derrite con el calor del aliento y le obstruye la garganta.', 'El fuego podría tener origen real: cerca de Çıralı, en Turquía, el monte Yanartaş arde desde hace milenios.'],
    fun: 'Allí, antigua Licia, brotan llamas de las rocas por escapes de gas natural: se cree que inspiraron la leyenda de la bestia que escupe fuego.',
  });

  /* ---- animación ---- */
  const col = new THREE.Color(), tp = V(), tp2 = V(), tg = V();
  function update(t) {
    const ph = t % 8, b = ph < 2.8 ? Math.sin((Math.PI * ph) / 2.8) : 0;
    body.scale.y = 1 + Math.sin(t * 1.5) * 0.012;
    lion.rotation.y = Math.sin(t * 0.4) * 0.14; lion.rotation.z = Math.sin(t * 0.6) * 0.04 + b * 0.18;
    jawG.rotation.z = -(0.08 + b * 0.6);
    gh.rotation.z = -0.35 + Math.sin(t * 1.1) * 0.08; gh.rotation.y = Math.sin(t * 0.5) * 0.2;
    gjaw.position.y = -0.12 - Math.abs(Math.sin(t * 5)) * 0.025;
    gEars.forEach((e, i) => { e.rotation.x = (i ? 1 : -1) * (0.5 + Math.max(0, Math.sin(t * 2.3 + i * 2)) * 0.35); });

    for (let i = 0; i < N_SNAKE; i++) {
      const s = i / (N_SNAKE - 1);
      tailPt(s, t, tp);
      d.position.copy(tp); d.quaternion.identity(); d.scale.setScalar((0.14 * Math.pow(1 - s, 0.8) + 0.04) * 1.15); d.updateMatrix(); snake.setMatrixAt(i, d.matrix);
    }
    snake.instanceMatrix.needsUpdate = true;
    tailPt(1, t, tp); tailPt(0.96, t, tp2); tg.copy(tp).sub(tp2).normalize();
    sh.position.copy(tp).addScaledVector(tg, 0.06); sh.quaternion.setFromUnitVectors(V(1, 0, 0), tg);
    tongue.scale.x = 0.4 + Math.max(0, Math.sin(t * 9)) * 0.9;

    fl.intensity = b * 25;
    for (let i = 0; i < NF; i++) {
      const [s, ry, rz] = seeds[i], p = (t * 0.9 + s) % 1, sp = p * 0.9;
      fp[i * 3] = mouth.x + p * 3.8; fp[i * 3 + 1] = mouth.y + rz * sp + p * p * 0.7; fp[i * 3 + 2] = ry * sp * 1.3;
      col.setHSL(0.02 + 0.1 * (1 - p), 1, 0.5).multiplyScalar(b * (1 - p) * 1.4);
      fc[i * 3] = col.r; fc[i * 3 + 1] = col.g; fc[i * 3 + 2] = col.b;
    }
    fg.attributes.position.needsUpdate = fg.attributes.color.needsUpdate = true;
  }
  return { group, parts, update };
}

export default {
  id: 'quimera', category: 'criatura', icon: '🦁', accent: '#ffb347',
  name: 'Quimera', latin: 'Criatura mitológica · Grecia antigua',
  summary: 'Monstruo de la mitología griega con tres cuerpos en uno: león por delante, cabra en medio y serpiente por detrás. Hija de Tifón y Équidna, escupía fuego hasta que Belerofonte acabó con ella.',
  stats: [['Cabezas', '3 (león, cabra, serpiente)'], ['Aliento', 'Fuego'], ['Origen', 'Licia (Anatolia)'], ['Padres', 'Tifón y Équidna'], ['Fuentes', 'Homero · Hesíodo'], ['Vencida por', 'Belerofonte']],
  curiosities: [
    'Homero la describe así: "delante león, detrás serpiente y en medio cabra", y añade que respiraba un fuego terrible.',
    'En genética, una quimera es un organismo con células de dos o más individuos distintos: el nombre del mito pasó a la ciencia.',
    'En el sur de Turquía, el monte Yanartaş arde sin parar desde hace milenios por escapes de gas: se llama Chimaera y es una atracción turística.',
  ],
  env: { bgTop: '#1a0f08', bgBottom: '#4a2a12', fog: '#2a1608', fogDensity: 0.02, bloom: [0.5, 0.6, 0.8], envInt: 0.5, key: 2.2, hemi: 0.5, dustR: 14, dustN: 300, floorY: 0, floorR: 7.5 },
  camera: { pos: [5.8, 3.4, 10.5], target: [1.0, 1.5, 0], min: 1, max: 28 },
  build,
};
