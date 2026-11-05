import * as THREE from 'three';
import { V, mat } from '../utils.js';

const N_TENT = 56, T_PTS = 28, N_ARM = 4, ARM_PTS = 26;

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };

  /* campana */
  const bell = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 64, 40, 0, Math.PI * 2, 0, 1.75),
    new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.36, roughness: 0.12, emissive: 0x2a6fff, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 }));
  shell.scale.y = 0.72;
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 48, 32, 0, Math.PI * 2, 0, 1.7),
    new THREE.MeshStandardMaterial({ color: 0xb9a6ff, transparent: true, opacity: 0.22, emissive: 0x6a3bff, emissiveIntensity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  inner.scale.y = 0.62;
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.476, 0.028, 10, 96).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8fe9ff, emissive: 0x4fd8ff, emissiveIntensity: 1.2 }));
  rimRing.position.y = -0.192;
  bell.add(shell, inner, rimRing);
  add(bell, {
    id: 'campana', name: 'Campana (umbrela)', pickThrough: true, explode: [0, 1.1, 0],
    desc: 'Cúpula gelatinosa que se contrae con ritmo para impulsar al animal. Al relajarse recupera su forma por pura elasticidad, como un muelle.',
    facts: ['Está formada por mesoglea: una gelatina con cerca de un 95 % de agua.', 'Cada contracción expulsa agua hacia abajo y empuja a la medusa hacia arriba.', 'Es translúcida: no necesita pigmentos porque no tiene que esconderse de depredadores visuales en aguas abiertas.'],
    fun: 'Es uno de los nadadores más eficientes del océano: gasta muy poca energía por metro recorrido.',
  });

  /* gónadas */
  const gon = new THREE.Group();
  const gMat = new THREE.MeshStandardMaterial({ color: 0xff7ab8, emissive: 0xff2d8a, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 14, 40, Math.PI * 1.65).rotateX(Math.PI / 2), gMat);
    const a = i * Math.PI / 2 + Math.PI / 4;
    t.position.set(Math.cos(a) * 0.52, 0.25, Math.sin(a) * 0.52); t.rotation.y = -a + 0.6;
    gon.add(t);
  }
  add(gon, {
    id: 'gonadas', name: 'Gónadas', explode: [0, 0.45, 0],
    desc: 'Cuatro anillos en forma de herradura visibles a través de la campana. Allí se producen los gametos: son la seña de identidad de Aurelia aurita.',
    facts: ['Su tono (rosa, violeta, amarillo) varía según el sexo y la dieta.', 'Las hembras guardan los huevos en pliegues de los brazos orales.', 'De los huevos nacen larvas que se fijan al fondo y se convierten en pólipos.'],
    fun: 'Cuatro herraduras visibles: así se reconoce a esta especie de un vistazo.',
  });

  /* rhopalia */
  const rho = new THREE.Group();
  const rMat = new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffc233, emissiveIntensity: 1.4 });
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), rMat);
    s.position.set(Math.cos(a) * 1.476, -0.192, Math.sin(a) * 1.476); rho.add(s);
  }
  add(rho, {
    id: 'rhopalia', name: 'Rhopalia (sensores)', explode: [0, -0.35, 0], anchor: [1.36, -0.19, 0.56], radius: 0.7, dist: 3.2,
    desc: 'Ocho órganos sensoriales en el borde de la campana. Cada uno contiene estatocistos —diminutos "cristales" que informan de la gravedad— y ocelos sensibles a la luz.',
    facts: ['Les permiten saber qué lado es "arriba" sin necesidad de cerebro.', 'Actúan además como marcapasos de las pulsaciones de la campana.'],
    fun: 'Sin cerebro, su sistema nervioso es una red difusa distribuida por todo el cuerpo.',
  });

  /* brazos orales (instanciados) */
  const armMat = new THREE.MeshStandardMaterial({ color: 0xffc4e6, emissive: 0xff5fb0, emissiveIntensity: 0.45, transparent: true, opacity: 0.85, roughness: 0.4 });
  const arms = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), armMat, N_ARM * ARM_PTS);
  arms.frustumCulled = false;
  const armHolder = new THREE.Group(); armHolder.add(arms);
  add(armHolder, {
    id: 'brazos', name: 'Brazos orales', explode: [0, -0.9, 0], anchor: [0, -1.3, 0], radius: 1.4, dist: 5,
    desc: 'Cuatro brazos frondosos alrededor de la boca. Atrapan plancton, huevos y pequeños crustáceos, y los conducen hacia la boca con cilios y mucosidad.',
    facts: ['Una sola abertura hace de boca y de ano.', 'La comida se digiere en una cavidad gastrovascular con canales radiales que reparten nutrientes.'],
    fun: 'Se alimenta moviendo el agua: su mucosidad atrapa partículas de apenas décimas de milímetro.',
  });

  /* tentáculos (líneas dinámicas) */
  const tMat = new THREE.LineBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const tents = new THREE.Group(), tLines = [];
  for (let k = 0; k < N_TENT; k++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(T_PTS * 3), 3));
    const l = new THREE.Line(g, tMat); l.frustumCulled = false; tents.add(l); tLines.push(l);
  }
  add(tents, {
    id: 'tentaculos', name: 'Tentáculos marginales', explode: [0, -1.7, 0], anchor: [0, -2.0, 0], radius: 2.0, dist: 7,
    desc: 'Cientos de filamentos finísimos que cuelgan del borde. Están cubiertos de nematocistos, células urticantes que inmovilizan a las presas.',
    facts: ['En Aurelia aurita el picotazo es muy leve para las personas.', 'Los nematocistos se disparan solo por contacto químico y mecánico.'],
    fun: 'Un nematocisto se dispara en microsegundos con aceleraciones de millones de g: de lo más rápido que hace un ser vivo.',
  });

  /* animación */
  const dummy = new THREE.Object3D();
  const bellParts = [bell, gon, rho];
  function update(t) {
    const p = Math.sin(t * 2.1), sx = 1 - 0.09 * p, sy = 1 + 0.2 * p;
    bellParts.forEach((o) => o.scale.set(sx, sy, sx));
    group.position.y = Math.sin(t * 2.1 - 1.3) * 0.28;
    const Rr = 1.476 * sx, yr = -0.192 * sy;

    for (let k = 0; k < N_TENT; k++) {
      const th = (k / N_TENT) * Math.PI * 2, L = 2.6 + 1.0 * Math.abs(Math.sin(k * 1.9)), arr = tLines[k].geometry.attributes.position;
      for (let i = 0; i < T_PTS; i++) {
        const s = i / (T_PTS - 1), r = Rr * (1 - 0.18 * s) + 0.12 * Math.sin(t * 1.3 + s * 5 + k) * s;
        const sw = Math.sin(t * 1.4 - s * 4 + k * 0.7) * 0.2 * s;
        arr.setXYZ(i, Math.cos(th) * r + Math.cos(th + 1.57) * sw, yr - s * L + 0.3 * p * s, Math.sin(th) * r + Math.sin(th + 1.57) * sw);
      }
      arr.needsUpdate = true;
    }

    for (let a = 0; a < N_ARM; a++) {
      const psi = (a / N_ARM) * Math.PI * 2 + 0.4;
      for (let i = 0; i < ARM_PTS; i++) {
        const s = i / (ARM_PTS - 1), len = 1.9 + 0.15 * p;
        const w = Math.sin(t * 1.6 - s * 3 + a * 1.3) * 0.16 * s, tw = psi + s * 1.6;
        const rad = 0.2 + 0.12 * Math.sin(s * 7 + a) * s;
        dummy.position.set(Math.cos(tw) * rad + w, -0.12 - s * len, Math.sin(tw) * rad + w * 0.6);
        dummy.scale.setScalar(0.16 * (1 - s * 0.82) + 0.025);
        dummy.updateMatrix(); arms.setMatrixAt(a * ARM_PTS + i, dummy.matrix);
      }
    }
    arms.instanceMatrix.needsUpdate = true;
  }
  return { group, parts, update };
}

export default {
  id: 'medusa', category: 'animal', icon: '🪼', accent: '#6ad6ff',
  name: 'Medusa luna', latin: 'Aurelia aurita · Cnidaria',
  summary: 'Una de las medusas más comunes del planeta. Su cuerpo translúcido, formado en un 95 % por agua, late como un paraguas de cristal sin necesitar cerebro, corazón ni pulmones.',
  stats: [['Diámetro', '25 – 40 cm'], ['Agua', '≈ 95 %'], ['Vida', '6 – 12 meses'], ['Hábitat', 'Mares templados'], ['Cerebro', 'Ninguno'], ['Antigüedad', '+500 M años']],
  curiosities: [
    'Las medusas existen desde hace más de 500 millones de años: son anteriores a los dinosaurios.',
    'Su ciclo de vida alterna entre la medusa que nada libre y un pólipo diminuto fijo al fondo.',
    'En 1991 miles de medusas viajaron en el transbordador Columbia para estudiar cómo afecta la gravedad al desarrollo.',
  ],
  env: { bgTop: '#020814', bgBottom: '#06304a', fog: '#06304a', fogDensity: 0.03, bloom: [0.85, 0.7, 0.55], envInt: 0.25, key: 0.9, hemi: 0.35, rim: 2.5, dustR: 12, dustN: 520, exposure: 1.1 },
  camera: { pos: [0, 0.6, 9.5], target: [0, -0.9, 0], min: 0.6, max: 26 },
  build,
};
