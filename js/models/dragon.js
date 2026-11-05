import * as THREE from 'three';
import { V, mat, bone, loft, scaleTexture, softSprite } from '../utils.js';

const SKIN = 0x2a8a68, BELLY = 0x9bb86a, BONE = 0xd9cfae;

function scaled(color, rx, ry) {
  const t = scaleTexture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ color, map: t, bumpMap: t, bumpScale: 2.5, roughness: 0.55, metalness: 0.1 });
}

function buildWing(boneM, memM) {
  const g = new THREE.Group();
  const S = V(0, 0, 0), W = V(-0.1, 0.9, 1.3);
  const F = [V(1.4, 0.5, 3.4), V(0.3, 0.3, 4.0), V(-1.0, 0.2, 3.6), V(-2.0, 0.1, 2.6)], B = V(-1.5, -0.5, 0.3);
  const tris = [[W, F[0], F[1]], [W, F[1], F[2]], [W, F[2], F[3]], [W, F[3], B], [S, W, B]];
  const arr = []; tris.forEach((t) => t.forEach((v) => arr.push(v.x, v.y, v.z)));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, memM));
  g.add(bone(S, W, 0.1, 0.07, boneM, 8));
  F.forEach((f) => g.add(bone(W, f, 0.055, 0.015, boneM, 6)));
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 8), boneM); claw.position.copy(W).add(V(0.1, 0.12, -0.05)); g.add(claw);
  return g;
}

function leg(hip, knee, hock, foot, m, claw) {
  const g = new THREE.Group();
  g.add(bone(hip, knee, 0.2, 0.13, m, 10), bone(knee, hock, 0.13, 0.09, m, 10), bone(hock, foot, 0.09, 0.08, m, 8));
  [knee, hock].forEach((p, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.1 : 0.14, 12, 10), m); s.position.copy(p); g.add(s); });
  for (let i = -1; i <= 1; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 6), claw);
    c.position.copy(foot).add(V(0.12, -0.03, i * 0.07)); c.rotation.z = -Math.PI / 2 + 0.2; g.add(c);
  }
  return g;
}

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };
  const boneM = mat(BONE, { roughness: 0.5 });

  /* curvas */
  const torsoC = new THREE.CatmullRomCurve3([V(-0.9, 1.15, 0), V(-0.2, 1.3, 0), V(0.5, 1.4, 0), V(1.0, 1.5, 0)]);
  const neckC = new THREE.CatmullRomCurve3([V(1.0, 1.5, 0), V(1.35, 1.85, 0), V(1.45, 2.35, 0), V(1.85, 2.75, 0)]);
  const tailC = new THREE.CatmullRomCurve3([V(-0.9, 1.15, 0), V(-1.6, 0.95, 0.05), V(-2.5, 0.7, 0.5), V(-3.4, 0.55, 0.2), V(-4.2, 0.8, -0.5), V(-4.8, 1.3, -0.5)]);
  const rTorso = (u) => 0.38 + 0.25 * Math.sin(Math.PI * u), rNeck = (u) => 0.36 - 0.16 * u, rTail = (u) => 0.38 * Math.pow(1 - u, 1.2) + 0.03;

  /* cuerpo (torso + cuello) */
  const body = new THREE.Group();
  const bm = scaled(SKIN, 10, 3);
  body.add(new THREE.Mesh(loft(torsoC, rTorso, 40, 24), bm), new THREE.Mesh(loft(neckC, rNeck, 40, 20), bm));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), bm); cap.position.copy(torsoC.getPoint(0)); body.add(cap);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat(BELLY, { roughness: 0.7 })); bell.scale.set(1.5, 0.55, 0.8); bell.position.set(0.1, 0.92, 0); body.add(bell);
  add(body, {
    id: 'cuerpo', name: 'Cuerpo y cuello', explode: [0, 0.2, 0], dist: 6,
    desc: 'Un torso poderoso cubierto de escamas imbricadas que protegen como una cota de malla, y un cuello largo y flexible que alza la cabeza sobre la presa.',
    facts: ['El vientre de escamas anchas y claras se arrastra sobre la roca y el oro.', 'En la tradición europea, ninguna espada común las atraviesa.'],
    fun: 'Se decía que las escamas de dragón estaban "templadas" por el fuego propio.',
  });

  /* cola (pivote en la cadera) */
  const tail = new THREE.Group(); tail.position.copy(tailC.getPoint(0));
  const tg = loft(tailC, rTail, 70, 16); tg.translate(-tail.position.x, -tail.position.y, -tail.position.z);
  tail.add(new THREE.Mesh(tg, scaled(SKIN, 22, 2)));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), mat(0x8a2031, { roughness: 0.5 }));
  const te = tailC.getPoint(1), td = tailC.getTangent(1);
  tip.position.copy(te).sub(tail.position).addScaledVector(td, 0.18); tip.quaternion.setFromUnitVectors(V(0, 1, 0), td); tail.add(tip);
  add(tail, {
    id: 'cola', name: 'Cola', explode: [-1.2, 0, 0], dist: 6,
    desc: 'Larga y musculosa, actúa de timón en el aire y de látigo en combate. Termina en una punta en forma de hoja.',
    facts: ['Equilibra el peso del cuello y la cabeza, como el balancín de un funambulista.', 'Se agita con un vaivén lento incluso en reposo.'],
    fun: 'En heráldica, la cola de dragón puede acabar en flecha, en pala o en dardo.',
  });

  /* espinas dorsales */
  const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 0.4, 6), boneM, 46);
  const d = new THREE.Object3D(); let n = 0;
  [[torsoC, rTorso, 12, 0.1, 0.9], [neckC, rNeck, 9, 0.05, 0.95], [tailC, rTail, 25, 0.04, 0.6]].forEach(([c, rf, cnt, u0, u1]) => {
    for (let i = 0; i < cnt && n < 46; i++, n++) {
      const u = u0 + (u1 - u0) * (i / (cnt - 1)), p = c.getPointAt(u), r = rf(u);
      d.position.copy(p).add(V(0, r * 0.95, 0)); d.rotation.set(0, 0, 0.35); d.scale.setScalar(Math.max(0.35, r * 2.2)); d.updateMatrix(); spikes.setMatrixAt(n, d.matrix);
    }
  });
  spikes.count = n;
  add(spikes, {
    id: 'espinas', name: 'Espinas dorsales', explode: [0, 1.2, 0], dist: 6,
    desc: 'Una cresta de púas óseas recorre el lomo desde la nuca hasta la cola; crecen más en la cruz y se hacen pequeñas hacia la punta.',
    facts: ['Defienden las zonas vulnerables del cuello.', 'Sirven también como exhibición ante rivales y parejas.'],
    fun: 'Muchos lagartos reales, como las iguanas, tienen cresta dorsal con la misma función de exhibición.',
  });

  /* cabeza */
  const HP = neckC.getPoint(1), HR = -0.25, hMat = scaled(SKIN, 3, 2);
  const head = new THREE.Group(); head.position.copy(HP); head.rotation.z = HR;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), hMat); skull.scale.set(1.25, 0.85, 0.85); skull.position.x = 0.1; head.add(skull);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.7, 16).rotateZ(-Math.PI / 2), hMat); snout.scale.z = 0.8; snout.position.x = 0.55; head.add(snout);
  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, 0.65, 14).rotateZ(-Math.PI / 2), hMat); jaw.scale.z = 0.8; jaw.position.set(0.5, -0.15, 0); jaw.rotation.z = 0.12; head.add(jaw);
  const tM = mat(0xf2ead2);
  for (let i = 0; i < 5; i++) [-1, 1].forEach((s) => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.11, 5), tM); t.rotation.z = Math.PI; t.position.set(0.35 + i * 0.1, -0.1, s * (0.15 - i * 0.01)); head.add(t);
  });
  const eM = new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0xffaa00, emissiveIntensity: 1.6 });
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), eM); e.position.set(0.3, 0.12, s * 0.22); head.add(e);
    const nstr = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(0x050505)); nstr.position.set(0.9, 0.04, s * 0.06); head.add(nstr);
  });
  add(head, {
    id: 'cabeza', name: 'Cabeza', explode: [0.9, 0.4, 0], dist: 3.6,
    desc: 'Cráneo alargado, mandíbula con dientes cónicos y ojos dorados de pupila rasgada. Su olfato y su vista son legendarios.',
    facts: ['Los ojos brillan de noche, como los de los felinos, gracias a un tapetum lucidum.', 'Las fosas nasales se sitúan en el extremo del hocico.'],
    fun: 'La palabra "dragón" viene del griego drákōn, que significaba "serpiente de mirada penetrante".',
  });

  /* cuernos (misma referencia que la cabeza) */
  const horns = new THREE.Group(); horns.position.copy(HP); horns.rotation.z = HR;
  [-1, 1].forEach((s) => {
    const c = new THREE.CatmullRomCurve3([V(-0.02, 0.2, s * 0.15), V(-0.3, 0.38, s * 0.25), V(-0.65, 0.48, s * 0.32), V(-0.95, 0.38, s * 0.3)]);
    horns.add(new THREE.Mesh(loft(c, (u) => 0.075 * (1 - u) + 0.004, 24, 10), boneM));
  });
  add(horns, {
    id: 'cuernos', name: 'Cuernos', explode: [-0.4, 1.0, 0], dist: 3.4,
    desc: 'Dos cuernos curvos de queratina hacia atrás, con surcos de crecimiento. Se usan en cortejo y en combate.',
    facts: ['Cada anillo representaría un periodo de crecimiento.', 'Su curvatura evita trabarse al volar entre ramas.'],
    fun: 'En Asia oriental, los cuernos del dragón simbolizan sabiduría y dominio sobre las lluvias.',
  });

  /* alas */
  const wm = new THREE.MeshStandardMaterial({ color: 0x8a1c2b, emissive: 0x3a0510, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.75, transparent: true, opacity: 0.9 });
  const wings = new THREE.Group();
  const WL = new THREE.Group(), WR = new THREE.Group();
  WL.position.set(0.35, 1.95, 0.3); WR.position.set(0.35, 1.95, -0.3);
  WL.add(buildWing(boneM, wm)); const wr = buildWing(boneM, wm); wr.scale.z = -1; WR.add(wr);
  wings.add(WL, WR);
  add(wings, {
    id: 'alas', name: 'Alas', explode: [0, 1.5, 0], dist: 9, view: [0.3, 1.2, 0.8],
    desc: 'Membranas de cuero extendidas entre dedos alargados, como las de un murciélago. Alcanzan unos 18 m de envergadura en la leyenda.',
    facts: ['Un solo aleteo levanta nubes de ceniza.', 'Los dragones europeos tienen seis extremidades si se cuentan las alas; las "wyvern" solo dos patas.'],
    fun: 'Los dragones chinos (lóng) casi nunca tienen alas: vuelan por pura magia.',
  });

  /* patas */
  const lm = scaled(SKIN, 3, 2), claw = boneM, legs = new THREE.Group();
  [-1, 1].forEach((s) => {
    legs.add(leg(V(0.55, 1.05, s * 0.4), V(0.75, 0.62, s * 0.58), V(0.82, 0.3, s * 0.6), V(0.88, 0.07, s * 0.6), lm, claw));
    legs.add(leg(V(-0.75, 1.0, s * 0.45), V(-0.35, 0.55, s * 0.7), V(-0.8, 0.3, s * 0.68), V(-0.55, 0.07, s * 0.7), lm, claw));
  });
  add(legs, {
    id: 'patas', name: 'Patas y garras', explode: [0, -0.5, 0], dist: 6,
    desc: 'Cuatro patas robustas con tres dedos armados con garras afiladas. Las traseras, más largas, impulsan los saltos de despegue.',
    facts: ['Las garras se afilan contra la roca.', 'Las patas delanteras sujetan la presa mientras vuela.'],
    fun: 'Los fósiles de dinosaurios hallados en China se llamaron "huesos de dragón" durante siglos.',
  });

  /* fuego */
  const NF = 240, fp = new Float32Array(NF * 3), fc = new Float32Array(NF * 3), seeds = Array.from({ length: NF }, () => [Math.random(), Math.random() - 0.5, Math.random() - 0.5]);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  const fire = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.6, map: softSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fire.frustumCulled = false;
  const mouth = V(0.9, 0, 0).applyAxisAngle(V(0, 0, 1), HR).add(HP), fdir = V(Math.cos(HR), Math.sin(HR), 0);
  const fl = new THREE.PointLight(0xff8a3a, 0, 14); fl.position.copy(mouth).addScaledVector(fdir, 1.2);
  const fireG = new THREE.Group(); fireG.add(fire, fl);
  add(fireG, {
    id: 'fuego', name: 'Aliento de fuego', explode: [1.2, 0.4, 0], anchorFn: (o) => o.copy(mouth).addScaledVector(fdir, 1.5).add(fireG.position), radius: 1.6, dist: 5,
    desc: 'Una llamarada que brota en ráfagas desde las fauces. Según la leyenda, nace de glándulas que mezclan gases inflamables con una chispa.',
    facts: ['En la leyenda alcanza temperaturas capaces de fundir el metal.', 'Se alimenta de un órgano propio: la "bolsa del fuego".'],
    fun: 'La salamandra mítica, hermana del dragón, vivía dentro del fuego sin quemarse.',
  });

  const col = new THREE.Color();
  function update(t) {
    const a = 0.25 + 0.55 * Math.sin(t * 1.6);
    WL.rotation.x = -a; WR.rotation.x = a;
    group.position.y = Math.sin(t * 1.6 + 0.4) * 0.12;
    tail.rotation.y = Math.sin(t * 0.9) * 0.12;
    head.rotation.z = horns.rotation.z = HR + Math.sin(t * 0.7) * 0.04;
    jaw.rotation.z = 0.12 + (Math.max(0, Math.sin(t * 0.9)) * 0.25);
    const ph = t % 7, b = ph < 2.4 ? Math.sin((Math.PI * ph) / 2.4) : 0;
    jaw.rotation.z = 0.12 + b * 0.3; fl.intensity = b * 25;
    for (let i = 0; i < NF; i++) {
      const [s, ry, rz] = seeds[i], p = (t * 0.9 + s) % 1, sp = p * 0.9;
      fp[i * 3] = mouth.x + fdir.x * p * 3.8 + ry * sp; fp[i * 3 + 1] = mouth.y + fdir.y * p * 3.8 + rz * sp + p * p * 0.7; fp[i * 3 + 2] = mouth.z + ry * sp * 1.3;
      col.setHSL(0.02 + 0.1 * (1 - p), 1, 0.5).multiplyScalar(b * (1 - p) * 1.4);
      fc[i * 3] = col.r; fc[i * 3 + 1] = col.g; fc[i * 3 + 2] = col.b;
    }
    fg.attributes.position.needsUpdate = fg.attributes.color.needsUpdate = true;
  }
  return { group, parts, update };
}

export default {
  id: 'dragon', category: 'criatura', icon: '🐉', accent: '#5fe0a0',
  name: 'Dragón esmeralda', latin: 'Criatura mitológica · tradición europea',
  summary: 'Reptil alado y escupefuego de la mitología europea. Guardián de tesoros y símbolo de poder, este ejemplar reúne todos los rasgos clásicos del bestiario medieval.',
  stats: [['Envergadura', '≈ 18 m (leyenda)'], ['Longitud', '≈ 9 m'], ['Aliento', 'Fuego'], ['Longevidad', 'Siglos'], ['Hábitat', 'Montañas y cuevas'], ['Origen', 'Mitología']],
  curiosities: [
    'El dragón de Komodo es real: mide hasta unos 3 m y su mordedura inocula veneno.',
    'En Europa suelen ser destructores; en China, el lóng es un ser benéfico ligado al agua y la lluvia.',
    'La bandera de Gales luce un dragón rojo desde hace siglos.',
  ],
  env: { bgTop: '#050a10', bgBottom: '#1a2a2a', fog: '#16231f', fogDensity: 0.02, bloom: [0.55, 0.6, 0.8], envInt: 0.55, key: 2.0, hemi: 0.5, dustR: 14, dustN: 360, floorY: 0, floorR: 8 },
  camera: { pos: [7, 3.8, 11], target: [-0.4, 1.6, 0], min: 1, max: 30 },
  build,
};
