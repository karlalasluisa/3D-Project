import * as THREE from 'three';
import { V, mat, smoothstep, fbm, rand, canvasTex, softSprite } from '../utils.js';

const SIZE = 38, SEG = 220, LAKE_Y = 3.85;

function height(x, z) {
  const r = Math.hypot(x, z);
  const warp = (fbm(x * 0.15 + 3, z * 0.15 + 7, 3) - 0.5) * 6;
  const base = 2.1 * (1 - smoothstep(5, 12.5, r + warp));
  let cone = 5.5 * Math.pow(Math.max(0, 1 - r / 12), 1.5);
  cone -= 1.9 * (1 - smoothstep(0, 2.2, r));
  const det = (fbm(x * 0.35, z * 0.35, 5) - 0.5) * (0.35 + 0.9 * smoothstep(2, 6, r)) * 1.6 * (1 - smoothstep(9, 13, r));
  return base + cone + det - 0.9;
}

const C = {
  sand: new THREE.Color(0x4d4a46), jungleA: new THREE.Color(0x2c6a38), jungleB: new THREE.Color(0x48913f),
  rock: new THREE.Color(0x4b4540), ash: new THREE.Color(0x2b2724), seabed: new THREE.Color(0x1d2b33), pale: new THREE.Color(0xc2b58e),
};

function buildTerrain() {
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, h);
    const sl = Math.hypot(height(x + 0.3, z) - h, height(x, z + 0.3) - h) / 0.3, n = fbm(x * 0.9, z * 0.9, 3);
    if (h < 0) c.copy(C.seabed).lerp(C.sand, smoothstep(-0.9, 0, h));
    else if (h < 0.4) c.copy(C.sand).lerp(C.pale, 0.35 * n);
    else if (h < 2.7) c.copy(C.jungleA).lerp(C.jungleB, n).lerp(C.sand, smoothstep(0.4, 0.9, 0.9 - h + 0.4) * 0.6);
    else c.copy(C.rock).lerp(C.ash, smoothstep(2.7, 4.6, h) * 0.8 + n * 0.2);
    c.lerp(C.rock, smoothstep(0.55, 1.1, sl) * (h > 0.3 ? 1 : 0));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
}

function lavaTexture() {
  const t = canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.045, y * 0.045, 4), v = Math.min(1, Math.abs(Math.sin(n * 9)) * 1.1), i = (y * w + x) * 4;
      const k = 1 - v; // fisuras brillantes
      img.data[i] = 70 + 185 * k; img.data[i + 1] = 8 + 150 * k * k; img.data[i + 2] = 0 + 40 * k * k * k; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; return t;
}

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };

  /* terreno */
  const terrain = buildTerrain();
  add(terrain, {
    id: 'cono', name: 'Cono volcánico', anchor: [-3.6, 3.0, -2.4], radius: 5, dist: 11,
    desc: 'La montaña se construyó capa sobre capa con coladas de lava y ceniza solidificadas. Sus laderas son empinadas arriba y se suavizan hacia la costa.',
    facts: ['Las rocas dominantes son basaltos oscuros, ricos en hierro y magnesio.', 'La arena negra de las playas nace de basalto triturado por el oleaje.'],
    fun: 'Surtsey, en Islandia, surgió del mar en 1963: es una isla volcánica nueva que pudo estudiarse desde su nacimiento.',
  });

  /* lago de lava */
  const lavaTex = lavaTexture();
  const lavaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: lavaTex, emissive: 0xffffff, emissiveMap: lavaTex, emissiveIntensity: 1.9, roughness: 0.5 });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48).rotateX(-Math.PI / 2), lavaMat); lake.position.y = LAKE_Y;
  // brasas
  const NE = 140, ep = new Float32Array(NE * 3), ec = new Float32Array(NE * 3), es = Array.from({ length: NE }, () => [Math.random(), Math.random() * 6.283, 0.8 + Math.random() * 1.6, 2.2 + Math.random() * 2.2]);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.16, map: softSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); embers.frustumCulled = false;
  const glow = new THREE.PointLight(0xff6a2a, 40, 16); glow.position.set(0, LAKE_Y + 1.2, 0);
  const crater = new THREE.Group(); crater.add(lake, embers, glow);
  add(crater, {
    id: 'crater', name: 'Cráter y lago de lava', explode: [0, 1.6, 0], anchor: [0, LAKE_Y, 0], radius: 1.8, dist: 6,
    desc: 'En la cima, una caldera aloja un lago de lava incandescente. Aquí llega el magma desde la cámara magmática, a kilómetros de profundidad.',
    facts: ['La lava basáltica surge entre 1 000 y 1 200 °C.', 'Las brasas son fragmentos de lava lanzados por el estallido de burbujas de gas.'],
    fun: 'Al enfriarse, la lava pasa de naranja brillante a rojo oscuro y, por fin, a negro: su color revela su temperatura.',
  });

  /* coladas */
  const rivers = new THREE.Group();
  [0.35, 2.55, 4.4].forEach((a0, k) => {
    let x = Math.cos(a0) * 2.7, z = Math.sin(a0) * 2.7, a = a0; const pts = [];
    for (let s = 0; s < 80; s++) {
      const h = height(x, z); pts.push(V(x, h + 0.07, z)); if (h < 0.45) break;
      const gx = (height(x + 0.2, z) - height(x - 0.2, z)) / 0.4, gz = (height(x, z + 0.2) - height(x, z - 0.2)) / 0.4, gl = Math.hypot(gx, gz) || 1;
      const nx = -gx / gl + (fbm(s * 0.2 + k * 9, 1, 2) - 0.5) * 0.7, nz = -gz / gl + (fbm(s * 0.2 + k * 9, 5, 2) - 0.5) * 0.7, nl = Math.hypot(nx, nz) || 1;
      x += (nx / nl) * 0.4; z += (nz / nl) * 0.4;
    }
    if (pts.length > 4) { const c = new THREE.CatmullRomCurve3(pts); const tx = lavaTex.clone(); tx.needsUpdate = true; tx.repeat.set(pts.length * 0.4, 1);
      rivers.add(new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 3, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 1.7 }))); }
  });
  const rc = rivers.children[0]?.geometry.parameters.path.getPoint(0.4) ?? V(3, 2, 0);
  add(rivers, {
    id: 'coladas', name: 'Coladas de lava', explode: [0, 0.9, 0], anchor: [rc.x, rc.y, rc.z], radius: 3.5, dist: 8,
    desc: 'Ríos de roca fundida que descienden por las laderas siguiendo las pendientes. Se enfrían y endurecen en el camino al mar.',
    facts: ['Las coladas fluidas forman corrientes lisas ("pāhoehoe"); las viscosas, bloques ásperos ("ʻaʻā").', 'Cuando llegan al agua se enfrían de golpe y crean nubes de vapor.'],
    fun: 'Las coladas de lava rara vez superan los 10 km/h; de hecho, casi siempre se puede huir caminando.',
  });

  /* bosque */
  const rng = rand(7), trees = [];
  for (let i = 0; i < 4000 && trees.length < 750; i++) {
    const x = (rng() - 0.5) * 24, z = (rng() - 0.5) * 24, h = height(x, z), sl = Math.hypot(height(x + 0.3, z) - h, height(x, z + 0.3) - h) / 0.3;
    if (h > 0.55 && h < 2.6 && sl < 0.9) trees.push([x, h, z, 0.7 + rng() * 0.8, rng()]);
  }
  const forest = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), trees.length);
  const dm = new THREE.Object3D(), cc = new THREE.Color();
  trees.forEach(([x, h, z, s, r], i) => { dm.position.set(x, h + 0.25 * s, z); dm.scale.set(s, s * 1.4, s); dm.rotation.y = r * 6; dm.updateMatrix(); forest.setMatrixAt(i, dm.matrix); forest.setColorAt(i, cc.setHSL(0.28 + r * 0.07, 0.55, 0.2 + r * 0.12)); });
  add(forest, {
    id: 'bosque', name: 'Bosque tropical', explode: [0, 1.2, 0], anchor: [4.8, 1.4, 3.4], radius: 5, dist: 9,
    desc: 'En las laderas medias, la ceniza se convierte en suelo fértil y la selva recupera la isla. Es el primer ecosistema que coloniza la roca.',
    facts: ['Los suelos volcánicos son ricos en minerales y excelentes para la agricultura.', 'Tras una erupción, líquenes y helechos son los primeros colonizadores.'],
    fun: 'Muchas de las zonas más pobladas del mundo viven junto a volcanes precisamente por la fertilidad de sus suelos.',
  });

  /* océano */
  const ow = 56, os = 110, og = new THREE.PlaneGeometry(ow, ow, os, os).rotateX(-Math.PI / 2), opos = og.attributes.position;
  const ocean = new THREE.Mesh(og, new THREE.MeshPhysicalMaterial({ color: 0x0a4a68, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.86, clearcoat: 1, emissive: 0x04202c, emissiveIntensity: 0.6 }));
  ocean.position.y = 0.02;
  add(ocean, {
    id: 'oceano', name: 'Océano', pickThrough: true, explode: [0, -1.4, 0], anchor: [9.5, 0.1, 5], radius: 6, dist: 12,
    desc: 'El mar rodea la isla. El agua enfría la lava que llega a la costa y, con el tiempo, el oleaje forma playas, acantilados y arrecifes.',
    facts: ['El 70 % de la superficie terrestre es océano.', 'Los volcanes submarinos son muchísimos más que los visibles en superficie.'],
    fun: 'Mauna Kea, en Hawái, mide más de 10 000 m desde la base submarina: más que el Everest.',
  });

  /* nubes */
  const clouds = new THREE.Group(), cMat = new THREE.MeshStandardMaterial({ color: 0xe6d9e0, emissive: 0x2a1a24, roughness: 1, transparent: true, opacity: 0.92 });
  const cl = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group(), n = 5 + (i % 3);
    for (let j = 0; j < n; j++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + rng() * 0.8, 1), cMat); s.position.set((j - n / 2) * 0.9, rng() * 0.5, (rng() - 0.5) * 1.2); s.scale.y = 0.6; c.add(s); }
    c.userData = { r: 11 + (i % 3) * 2.5, a: i * 1.05, v: 0.03 + (i % 3) * 0.01, y: 9 + (i % 2) * 1.5 }; clouds.add(c); cl.push(c);
  }
  add(clouds, {
    id: 'nubes', name: 'Nubes', explode: [0, 3.5, 0], anchorFn: (o) => cl[0].getWorldPosition(o), radius: 4, dist: 10,
    desc: 'Cúmulos que se forman cuando el aire cálido y húmedo asciende por la ladera. Se tiñen de rosa y naranja con la luz del atardecer.',
    facts: ['El vapor del volcán y del mar alimenta su crecimiento.', 'Las nubes de erupciones pueden generar rayos volcánicos.'],
    fun: 'Los rayos volcánicos surgen de partículas de ceniza que se cargan al rozarse entre sí.',
  });

  /* columna de ceniza */
  const NS = 260, sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3), ss = Array.from({ length: NS }, () => [Math.random(), Math.random() - 0.5, Math.random() - 0.5]);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const smoke = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.6, map: softSprite(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.7 })); smoke.frustumCulled = false;
  add(smoke, {
    id: 'ceniza', name: 'Columna de ceniza', explode: [0, 2.6, 0], anchor: [1.6, 8, 0], radius: 5, dist: 13,
    desc: 'Gases, vapor y partículas de roca pulverizada que ascienden en la atmósfera. Los vientos de altura la empujan lejos de la isla.',
    facts: ['El gas principal es vapor de agua, seguido de CO₂ y dióxido de azufre.', 'La ceniza fina puede dañar motores de aviones.'],
    fun: 'En 1883 la erupción del Krakatoa se oyó a casi 4 800 km de distancia.',
  });

  const sm0 = new THREE.Color(0x2e2628), sm1 = new THREE.Color(0x3a2330), col = new THREE.Color();
  function update(t) {
    // océano
    for (let i = 0; i < opos.count; i++) {
      const x = opos.getX(i), z = opos.getZ(i);
      opos.setY(i, 0.07 * Math.sin(x * 0.55 + t * 1.3) + 0.05 * Math.sin(z * 0.8 - t * 1.6) + 0.03 * Math.sin((x + z) * 1.3 + t * 2.2));
    }
    opos.needsUpdate = true; og.computeVertexNormals();
    // lava
    lavaTex.offset.set(t * 0.006, t * 0.01); lavaMat.emissiveIntensity = 1.7 + 0.35 * Math.sin(t * 2.5);
    glow.intensity = 36 + 8 * Math.sin(t * 3.1) + 5 * Math.sin(t * 7.3);
    // nubes
    cl.forEach((c) => { const u = c.userData; u.a += 0.0004 * (1 + u.v * 20); c.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r); c.rotation.y = -u.a; });
    // brasas
    for (let i = 0; i < NE; i++) {
      const [s, ang, v, life] = es[i], p = ((t / life) + s) % 1, tt = p * life;
      ep[i * 3] = Math.cos(ang) * v * tt * 0.9; ep[i * 3 + 1] = LAKE_Y + 0.3 + v * 2.2 * tt - 1.7 * tt * tt; ep[i * 3 + 2] = Math.sin(ang) * v * tt * 0.9;
      const f = (1 - p) * (ep[i * 3 + 1] > LAKE_Y ? 1 : 0); ec[i * 3] = f; ec[i * 3 + 1] = f * 0.45; ec[i * 3 + 2] = f * 0.1;
    }
    eg.attributes.position.needsUpdate = eg.attributes.color.needsUpdate = true;
    // humo
    for (let i = 0; i < NS; i++) {
      const [s, rx, rz] = ss[i], p = (t * 0.045 + s) % 1;
      sp[i * 3] = rx * (0.6 + p * 5) + p * p * 8; sp[i * 3 + 1] = 4.1 + p * 13; sp[i * 3 + 2] = rz * (0.6 + p * 5);
      col.copy(sm0).lerp(sm1, p).multiplyScalar(1 - p * 0.55); const f = Math.min(1, p * 5) * (1 - p);
      sc[i * 3] = col.r * f * 2; sc[i * 3 + 1] = col.g * f * 2; sc[i * 3 + 2] = col.b * f * 2;
    }
    sg.attributes.position.needsUpdate = sg.attributes.color.needsUpdate = true;
  }
  return { group, parts, update };
}

export default {
  id: 'isla', category: 'paisaje', icon: '🌋', accent: '#ff8a4c',
  name: 'Isla volcánica', latin: 'Estratovolcán activo · archipiélago oceánico',
  summary: 'Un volcán que emerge del océano, con su cráter incandescente, ríos de lava, selva tropical y un cielo de ceniza. Un paisaje que nace y se destruye a escala geológica.',
  stats: [['Altura (escena)', '≈ 1 800 m'], ['Lava', '≈ 1 100 °C'], ['Tipo', 'Estratovolcán'], ['Edad', '≈ 40 000 años'], ['Volcanes activos', '≈ 1 350 en el mundo'], ['Anillo de fuego', '≈ 75 % de ellos']],
  curiosities: [
    'El Cinturón de Fuego del Pacífico concentra cerca del 75 % de los volcanes del planeta.',
    'La lava se solidifica en basalto, una roca que acabará siendo suelo fértil.',
    'Hawái, Islandia y Canarias son islas nacidas de volcanes.',
  ],
  env: { bgTop: '#0a1226', bgBottom: '#5a2e3a', fog: '#3a2030', fogDensity: 0.016, bloom: [0.7, 0.6, 0.78], envInt: 0.3, key: 1.5, hemi: 0.55, rim: 1.4, dustR: 16, dustN: 200, exposure: 1.0 },
  camera: { pos: [17, 9, 19], target: [0, 2.2, 0], min: 2.5, max: 50 },
  build,
};
