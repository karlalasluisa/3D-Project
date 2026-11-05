import * as THREE from 'three';
import { V, mat, bone, canvasTex, gearGeometry, spiralCurve } from '../utils.js';

const M = 0.055;                       // módulo de los dientes
const rp = (N) => (M * N) / 2;         // radio primitivo
const GOLD = () => new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: 1, roughness: 0.22 });
const STEEL = (c = 0x7f8893) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.38 });
const ROSE = () => new THREE.MeshStandardMaterial({ color: 0xe0a089, metalness: 1, roughness: 0.25 });
const GZ = -0.3;

function handShape(len, w, back) {
  const s = new THREE.Shape();
  s.moveTo(0, len); s.lineTo(w, len * 0.14); s.lineTo(w * 0.4, -back); s.lineTo(-w * 0.4, -back); s.lineTo(-w, len * 0.14); s.closePath();
  return s;
}
const hand = (len, w, back, depth, m) => new THREE.Mesh(new THREE.ExtrudeGeometry(handShape(len, w, back), { depth, bevelEnabled: false }), m);

function build() {
  const group = new THREE.Group(), parts = [];
  const add = (obj, meta) => { group.add(obj); parts.push({ obj, ...meta }); return obj; };
  const rotZ = (g) => g.rotateX(Math.PI / 2);

  /* ----- caja ----- */
  const caseG = new THREE.Group(), caseM = STEEL(0x8d96a2);
  caseG.add(new THREE.Mesh(rotZ(new THREE.CylinderGeometry(4.45, 4.45, 2.0, 96, 1, true)), Object.assign(caseM, { side: THREE.DoubleSide })));
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.2, 20, 96), caseM); bezel.position.z = 1.1; caseG.add(bezel);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.6), caseM); l.position.set(sx * 2.6, sy * 4.6, 0); l.rotation.z = -sx * sy * 0.3; caseG.add(l);
  });
  add(caseG, {
    id: 'caja', name: 'Caja', explode: [0, 0, -0.4], dist: 12, radius: 5,
    desc: 'La armadura del reloj: protege el movimiento del polvo, el agua y los golpes, y sujeta la correa mediante las asas.',
    facts: ['Suele fabricarse en acero 316L, oro, titanio o cerámica.', 'La corona y el cristal necesitan juntas para resistir la presión del agua.'],
    fun: 'Las primeras cajas de reloj de bolsillo, hacia 1500, eran esferas de latón del tamaño de una naranja pequeña.',
  });

  const back = new THREE.Mesh(rotZ(new THREE.CylinderGeometry(4.3, 4.3, 0.3, 96)), STEEL(0x8f98a3)); back.position.z = -1.15;
  add(back, {
    id: 'fondo', name: 'Fondo de caja', explode: [0, 0, -3.8], dist: 12, radius: 5, view: [0.3, 0.2, -1],
    desc: 'La tapa trasera sella el movimiento. En relojes con fondo de zafiro permite admirar el mecanismo desde atrás.',
    facts: ['Puede atornillarse o encajarse a presión.', 'Suele grabarse con el número de serie y las características de estanqueidad.'],
    fun: 'El zafiro sintético que lo cubre es el segundo material más duro, tras el diamante, que se usa en relojería.',
  });

  /* ----- cristal ----- */
  const glass = new THREE.Mesh(rotZ(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 96)), new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.16, roughness: 0, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.z = 1.4;
  add(glass, {
    id: 'cristal', name: 'Cristal', pickThrough: true, explode: [0, 0, 3.6], dist: 11, radius: 5,
    desc: 'Una lente curva de zafiro sintético, resistente a los rayos. Un tratamiento antirreflejo mejora la lectura.',
    facts: ['Tiene dureza 9 en la escala de Mohs.', 'Es transparente casi al 100 %: cada reflejo es luz perdida.'],
    fun: 'Antes del zafiro se usaban plásticos acrílicos que se arañaban con facilidad, pero que se pulían a mano.',
  });

  /* ----- esfera esqueleto ----- */
  const dialTex = canvasTex(1024, 1024, (g) => {
    const c = 512, R = 512, ri = 3.55 / 4.2 * R;
    g.clearRect(0, 0, 1024, 1024);
    g.fillStyle = '#0c1424'; g.beginPath(); g.arc(c, c, R, 0, 7); g.arc(c, c, ri, 0, 7, true); g.fill('evenodd');
    g.strokeStyle = '#e8d9a8'; g.fillStyle = '#e8d9a8'; g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 6.283 - 1.5708, hr = i % 5 === 0;
      g.lineWidth = hr ? 8 : 3; g.beginPath();
      g.moveTo(c + Math.cos(a) * (hr ? R - 78 : R - 34), c + Math.sin(a) * (hr ? R - 78 : R - 34));
      g.lineTo(c + Math.cos(a) * (R - 12), c + Math.sin(a) * (R - 12)); g.stroke();
    }
    g.beginPath(); g.moveTo(c, 28 + 4); g.lineTo(c - 22, 100); g.lineTo(c + 22, 100); g.closePath(); g.fillStyle = '#ffb347'; g.fill();
  });
  const dial = new THREE.Mesh(new THREE.RingGeometry(3.55, 4.2, 96), new THREE.MeshStandardMaterial({ map: dialTex, transparent: true, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 }));
  dial.position.z = 0.55;
  add(dial, {
    id: 'esfera', name: 'Esfera esqueleto', explode: [0, 0, 1.0], dist: 11, radius: 5,
    desc: 'En un reloj esqueleto la esfera se reduce a un anillo con las marcas horarias: así queda a la vista todo el mecanismo.',
    facts: ['El minutero recorre 60 divisiones; cada cinco, una marca mayor señala la hora.', 'El triángulo naranja marca las 12.'],
    fun: 'Los relojes esqueleto se hacían a mano retirando metal de las platinas y puentes con sierras finísimas.',
  });

  /* ----- agujas ----- */
  const hands = new THREE.Group();
  const hH = hand(2.0, 0.16, 0.5, 0.05, STEEL(0x2c5fb0)), hM = hand(3.15, 0.13, 0.55, 0.05, STEEL(0x2c5fb0)), hS = hand(3.5, 0.04, 0.9, 0.03, new THREE.MeshStandardMaterial({ color: 0xff8a2a, metalness: 0.6, roughness: 0.3, emissive: 0x552200 }));
  hH.position.z = 0.82; hM.position.z = 0.92; hS.position.z = 1.02;
  const pin = new THREE.Mesh(rotZ(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24)), GOLD()); pin.position.z = 1.0;
  hands.add(hH, hM, hS, pin);
  add(hands, {
    id: 'agujas', name: 'Agujas', explode: [0, 0, 2.2], dist: 9, radius: 3.5,
    desc: 'Horaria, minutera y segundero (naranja). Giran movidas por el tren de engranajes con relaciones exactas: 12:1 entre minutera y horaria, 60:1 entre segundero y minutera.',
    facts: ['Están hechas de acero azulado por calor controlado a 300 °C.', 'En esta escena marcan la hora real de tu dispositivo.'],
    fun: 'Los relojeros posicionan las agujas a las 10:10 en fotografías para que no tapen el logo y parezcan sonreír.',
  });

  /* ----- corona ----- */
  const crown = new THREE.Group(), cm = GOLD();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 12).rotateZ(Math.PI / 2), STEEL()); stem.position.x = 4.55;
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 40).rotateZ(Math.PI / 2), cm); ch.position.x = 5.0;
  for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283, r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.06), STEEL(0x333a44)); r.position.set(5.0, Math.sin(a) * 0.4, Math.cos(a) * 0.4); r.rotation.x = -a + 1.5708; crown.add(r); }
  crown.add(stem, ch);
  add(crown, {
    id: 'corona', name: 'Corona', explode: [1.8, 0, 0], dist: 4.5, radius: 1,
    desc: 'La rueda del lateral. Sirve para dar cuerda al muelle y para ajustar la hora tirando de ella.',
    facts: ['Cada posición de tirada conecta un tren diferente: cuerda, hora y fecha.', 'Su estriado facilita agarrarla con los dedos.'],
    fun: 'Hasta los años veinte, las coronas casi no existían: los relojes de bolsillo se ajustaban con una llave.',
  });

  /* ----- platina con rubíes ----- */
  const plateTex = canvasTex(512, 512, (g) => {
    for (let i = 0; i < 40; i++) { const x = (i / 40) * 512, gr = g.createLinearGradient(x, 0, x + 12.8, 0); gr.addColorStop(0, '#d8dde4'); gr.addColorStop(1, '#6a7078'); g.fillStyle = gr; g.fillRect(x, 0, 12.8, 512); }
  });
  const plate = new THREE.Group();
  const plateMesh = new THREE.Mesh(rotZ(new THREE.CylinderGeometry(4.0, 4.0, 0.25, 96)), new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.9, roughness: 0.38 }));
  plateMesh.position.z = -0.7; plate.add(plateMesh);
  add(plate, {
    id: 'platina', name: 'Platina y rubíes', explode: [0, 0, -1.9], dist: 11, radius: 4,
    desc: 'La placa base sobre la que se montan todos los engranajes. Sus agujeros alojan los ejes, protegidos con rodamientos de rubí sintético.',
    facts: ['Los rubíes reducen la fricción y el desgaste de los pivotes.', 'El acabado de "côtes de Genève" son estrías pulidas que atrapan el polvo y decoran.'],
    fun: 'Se usan rubíes sintéticos desde 1902 (proceso Verneuil): un reloj típico lleva entre 17 y 25.',
  });

  /* ----- tren de engranajes: barrilete → central → tercera → cuarta → escape ----- */
  const chain = [
    { n: 48, par: -1, pos: V(-1.3, 0.7), spokes: 0, mk: GOLD, hole: 0.8 },
    { n: 36, par: 0, a: -55 },
    { n: 40, par: 1, a: -10 },
    { n: 30, par: 2, a: 80 },
    { n: 15, par: 3, a: 140 },
  ];
  chain.forEach((c, i) => {
    if (c.par >= 0) {
      const p = chain[c.par], a = (c.a * Math.PI) / 180;
      c.pos = p.pos.clone().add(V(Math.cos(a) * (rp(p.n) + rp(c.n)), Math.sin(a) * (rp(p.n) + rp(c.n))));
      c.alpha = a;
    }
    c.rp = rp(c.n);
  });
  const gMeshes = [];
  const mkGear = (c, mk, o) => {
    const m = new THREE.Mesh(gearGeometry(c.n, c.rp, M, o), mk());
    m.position.set(c.pos.x, c.pos.y, GZ); return m;
  };

  // barrilete + muelle
  const barrel = new THREE.Group(); barrel.position.set(chain[0].pos.x, chain[0].pos.y, GZ);
  const bGear = new THREE.Mesh(gearGeometry(48, chain[0].rp, M, { hole: 1.0, depth: 0.2 }), GOLD()); barrel.add(bGear);
  const spring = new THREE.Mesh(new THREE.TubeGeometry(spiralCurve(0.28, 0.98, 5.5, 280), 400, 0.028, 6), STEEL(0x6d7a8a)); barrel.add(spring);
  const hub = new THREE.Mesh(rotZ(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 24)), GOLD()); barrel.add(hub);
  add(barrel, {
    id: 'barrilete', name: 'Barrilete y muelle', explode: [0, 0, -1.5], dist: 5.5,
    desc: 'La batería mecánica. Un muelle espiral de acero, enrollado al dar cuerda, se desenrolla despacio y entrega la energía al resto del mecanismo.',
    facts: ['Es la fuente de energía; la "reserva de marcha" suele ser de 38 a 48 horas.', 'La dentadura exterior transmite el giro al tren de ruedas.'],
    fun: 'El muelle real mide cerca de 30 cm de largo y menos de una décima de milímetro de grosor.',
  });
  gMeshes[0] = barrel;

  // tren (ruedas 1,2,3)
  const train = new THREE.Group();
  [1, 2, 3].forEach((i) => {
    const c = chain[i], m = mkGear(c, i === 1 ? ROSE : i === 2 ? STEEL : GOLD, { hole: 0.1, spokes: 5, depth: 0.18, hub: 0.2, spokeW: 0.1 });
    train.add(m); gMeshes[i] = m;
    const px = new THREE.Mesh(rotZ(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 14)), STEEL(0xd0d6de)); px.position.set(c.pos.x, c.pos.y, GZ); train.add(px);
  });
  add(train, {
    id: 'tren', name: 'Tren de engranajes', explode: [0, 0, -0.9], dist: 8, anchor: [chain[1].pos.x, chain[1].pos.y, GZ], radius: 3.4,
    desc: 'Tres ruedas dentadas (central, tercera y cuarta) que multiplican la velocidad del barrilete hasta mover las agujas con precisión.',
    facts: ['La relación entre ruedas hace que cada eje gire a distinta velocidad.', 'La rueda de los segundos suele dar una vuelta por minuto.'],
    fun: 'Los dientes tienen perfil cicloidal o evolvente: está diseñado para que ruede sin deslizar.',
  });

  // escape
  const esc = new THREE.Group();
  const eC = chain[4], ewheel = mkGear(eC, STEEL.bind(null, 0xc8d0da), { hole: 0.05, spokes: 3, depth: 0.14, hub: 0.12, spokeW: 0.07, });
  esc.add(ewheel); gMeshes[4] = ewheel;
  const P = eC.pos.clone().add(V(Math.cos(1.75) * 1.5, Math.sin(1.75) * 1.5, 0));
  const anchor = new THREE.Group(); anchor.position.set(P.x, P.y, GZ + 0.1);
  const aM = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: 1, roughness: 0.25 });
  const rM = new THREE.MeshStandardMaterial({ color: 0xe0115f, emissive: 0x600030, roughness: 0.2 });
  [70, 130].forEach((deg) => {
    const a = (deg * Math.PI) / 180, e = V(eC.pos.x + Math.cos(a) * eC.rp, eC.pos.y + Math.sin(a) * eC.rp, 0).sub(V(P.x, P.y, 0));
    anchor.add(bone(V(0, 0, 0), e, 0.06, 0.06, aM, 8));
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), rM); r.position.copy(e); anchor.add(r);
  });
  anchor.add(new THREE.Mesh(rotZ(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 14)), aM));
  esc.add(anchor);
  add(esc, {
    id: 'escape', name: 'Escape de áncora', explode: [0, 0, -0.5], dist: 4.5, radius: 1.8,
    desc: 'El corazón del reloj: una áncora con dos paletas de rubí libera un diente de la rueda de escape por cada oscilación del volante, convirtiendo un giro continuo en "tics" regulares.',
    facts: ['Cada vaivén del áncora produce el característico "tic-tac".', 'El escape de áncora suizo, inventado hacia 1754, sigue usándose hoy.'],
    fun: 'Un reloj a 28 800 alternancias/hora acciona su escape ocho veces cada segundo, unas 700 000 veces al día.',
  });

  // volante + espiral
  const bal = new THREE.Group(), BP = V(-2.3, -1.7, -0.1);
  bal.position.copy(BP);
  const balRot = new THREE.Group(); bal.add(balRot);
  const bm = GOLD();
  balRot.add(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 16, 64), bm));
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; balRot.add(bone(V(0, 0, 0), V(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0), 0.05, 0.05, bm, 8)); }
  for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.7, s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), bm); s.position.set(Math.cos(a) * 1.07, Math.sin(a) * 1.07, 0); balRot.add(s); }
  balRot.add(new THREE.Mesh(rotZ(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 14)), STEEL(0xd0d6de)));
  const hair = new THREE.Mesh(new THREE.TubeGeometry(spiralCurve(0.15, 0.6, 7, 320), 500, 0.016, 5), new THREE.MeshStandardMaterial({ color: 0x4a76c9, metalness: 1, roughness: 0.3, emissive: 0x0b1f4a })); hair.position.z = 0.1; balRot.add(hair);
  add(bal, {
    id: 'volante', name: 'Volante y espiral', explode: [0, 0, 0.3], dist: 4.5, radius: 1.4,
    desc: 'Una rueda que oscila a un lado y a otro con ayuda de un muelle finísimo (el espiral). Es el "péndulo" del reloj de pulsera: marca el tempo.',
    facts: ['Realiza 4 oscilaciones completas por segundo en un calibre de 28 800 alt/h.', 'Pequeños tornillos en su borde sirven para ajustar la marcha.'],
    fun: 'El espiral fue patentado por Huygens hacia 1675 y permitió, por fin, relojes de bolsillo realmente precisos.',
  });

  /* ----- animación ----- */
  const o = { th: [0, 0, 0, 0, 0] };
  function update(t) {
    const t0 = -0.4 * t;                     // giro del barrilete
    gMeshes[0].rotation.z = t0;
    let thP = t0;
    for (let i = 1; i < 5; i++) {
      const c = chain[i], p = chain[c.par];
      const th = c.alpha + Math.PI - Math.PI / c.n + (c.alpha - thP) * (p.n / c.n);
      gMeshes[i].rotation.z = th; thP = th;
    }
    balRot.rotation.z = 1.1 * Math.sin(t * 5.6);
    hair.scale.setScalar(1 + 0.12 * Math.sin(t * 5.6 + 1.57));
    anchor.rotation.z = 0.14 * Math.sin(t * 5.6);
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, mi = d.getMinutes() + s / 60, h = (d.getHours() % 12) + mi / 60;
    hS.rotation.z = (-s / 60) * 6.2832; hM.rotation.z = (-mi / 60) * 6.2832; hH.rotation.z = (-h / 12) * 6.2832;
    group.rotation.y = Math.sin(t * 0.3) * 0.03;
  }
  return { group, parts, update };
}

export default {
  id: 'reloj', category: 'objeto', icon: '⌚', accent: '#e0b659',
  name: 'Reloj mecánico', latin: 'Calibre esqueleto · escape de áncora',
  summary: 'Un mecanismo de relojería a la vista: cada engranaje, resorte y rubí trabaja en conjunto para dividir el tiempo en oscilaciones exactas. Sin pilas, solo energía de un muelle.',
  stats: [['Piezas', '≈ 200'], ['Frecuencia', '28 800 alt/h'], ['Rubíes', '17 – 25'], ['Reserva', '≈ 40 h'], ['Diámetro', '≈ 42 mm'], ['Energía', 'Muelle']],
  curiosities: [
    'El primer reloj portátil se atribuye al cerrajero alemán Peter Henlein, hacia 1510.',
    'El escape de áncora moderno procede de Thomas Mudge (1754) y es la base del reloj suizo.',
    'Un reloj mecánico de 4 Hz late casi 350 000 veces al día.',
  ],
  env: { bgTop: '#080a12', bgBottom: '#171a26', fog: '#10131d', fogDensity: 0.006, bloom: [0.12, 0.3, 1.0], envInt: 0.55, key: 1.1, hemi: 0.15, rim: 0.8, exposure: 0.85, dustR: 10, dustN: 160 },
  camera: { pos: [4.5, -6, 12.5], target: [0, 0, 0], min: 1.2, max: 28 },
  build,
};
