import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MODELS } from './models/index.js';
import { softSprite } from './utils.js';

const $ = (s) => document.querySelector(s);
const CATS = { todo: 'Todo', animal: 'Animales', criatura: 'Criaturas', objeto: 'Objetos', paisaje: 'Paisajes' };
const CAT_NAME = { animal: 'Animal', criatura: 'Criatura', objeto: 'Objeto', paisaje: 'Paisaje' };

/* ---------- renderer / escena ---------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 400);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.06, screenSpacePanning: true, rotateSpeed: 0.7, autoRotateSpeed: 0.9 });

const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x0a0a14, 0.5);
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 8, 6);
const rim = new THREE.DirectionalLight(0xffffff, 2.0); rim.position.set(-6, 3, -5);
scene.add(hemi, key, rim);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  // en pantallas estrechas el modelo se desplaza para no quedar bajo el panel
  camera.setViewOffset(w, h, innerWidth > 900 ? -40 : 0, 0, w, h);
}
addEventListener('resize', resize); resize();

/* ---------- ambiente (polvo, suelo) ---------- */
const dust = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({ size: 0.07, map: softSprite(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
);
dust.frustumCulled = false;
scene.add(dust);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
scene.add(floor);

function gradientBG(top, bottom) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, color); gr.addColorStop(0.5, color + '55'); gr.addColorStop(1, '#0000');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- estado ---------- */
let current = null, sel = -1, hover = -1;
let expl = 0, explTarget = 0, wire = false, labelsOn = false, tour = false, tourT = 0, tween = null;
const ACC = new THREE.Color('#6ad6ff');
const _v = new THREE.Vector3(), _b = new THREE.Box3();

/* ---------- carga de modelos ---------- */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function disposeModel(m) {
  scene.remove(m.group);
  m.group.traverse((o) => {
    o.geometry?.dispose();
    [].concat(o.material || []).forEach((mt) => { for (const k in mt) mt[k]?.isTexture && mt[k].dispose(); mt.dispose(); });
  });
}

async function loadModel(id, first = false) {
  const def = MODELS.find((m) => m.id === id) || MODELS[0];
  if (current?.def === def) return;
  $('#loader').classList.add('on');
  await delay(first ? 50 : 450);
  if (current) disposeModel(current);
  sel = hover = -1; tour = false; expl = explTarget = 0; tween = null;

  const built = def.build();
  current = { def, ...built };
  scene.add(current.group);
  current.update(0, 0);
  scene.updateMatrixWorld(true);
  current.group0 = current.group.position.clone();

  current.parts.forEach((p, i) => {
    p.index = i; p.obj.userData.partIndex = i;
    p.basePos = p.obj.position.clone();
    p.explode = new THREE.Vector3(...(p.explode || [0, 0, 0]));
    p.glow = 0; p.ghost = 0; p.mats = new Set();
    p.obj.traverse((o) => [].concat(o.material || []).forEach((mt) => {
      p.mats.add(mt);
      if (!mt.userData.base) mt.userData.base = {
        opacity: mt.opacity, transparent: mt.transparent, depthWrite: mt.depthWrite,
        emissive: mt.emissive?.clone(), ei: mt.emissiveIntensity ?? 0,
      };
    }));
    _b.makeEmpty().setFromObject(p.obj);
    p.radius ??= _b.isEmpty() ? 1.5 : _b.getSize(_v).length() / 2;
    if (p.anchor) p.anchor = new THREE.Vector3(...p.anchor);
  });

  // entorno
  const e = def.env;
  ACC.set(def.accent);
  document.documentElement.style.setProperty('--accent', def.accent);
  scene.background = gradientBG(e.bgTop, e.bgBottom);
  scene.fog = new THREE.FogExp2(e.fog ?? e.bgBottom, e.fogDensity ?? 0.012);
  scene.environmentIntensity = e.envInt ?? 0.6;
  hemi.intensity = e.hemi ?? 0.5; key.intensity = e.key ?? 2.2; rim.color.set(def.accent); rim.intensity = e.rim ?? 2;
  renderer.toneMappingExposure = e.exposure ?? 1.05;
  Object.assign(bloom, { strength: e.bloom?.[0] ?? 0.5, radius: e.bloom?.[1] ?? 0.6, threshold: e.bloom?.[2] ?? 0.85 });

  const dr = e.dustR ?? 14, n = e.dustN ?? 420, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = dr * Math.cbrt(Math.random()), a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
    arr.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3);
  }
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  dust.material.color.set(def.accent); dust.visible = n > 0;

  floor.visible = e.floorY !== undefined;
  if (floor.visible) {
    floor.position.y = e.floorY; floor.scale.setScalar(e.floorR ?? 7);
    floor.material.map = glowTexture(def.accent); floor.material.needsUpdate = true;
  }

  const c = def.camera;
  controls.minDistance = c.min; controls.maxDistance = c.max;
  const target = new THREE.Vector3(...c.target), pos = new THREE.Vector3(...c.pos);
  controls.target.copy(target);
  // entrada cinematográfica
  const off = pos.clone().sub(target);
  camera.position.copy(target).add(off.clone().multiplyScalar(1.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.9));
  flyTo(pos, target, 2.6);

  setWire(wire); buildHotspots(); renderModelPanel(); buildRail(); buildTabs();
  history.replaceState(null, '', '#' + def.id);
  $('#loader').classList.remove('on');
}

/* ---------- cámara ---------- */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function flyTo(pos, target, dur = 1.5) {
  tween = { t: 0, dur, p0: camera.position.clone(), p1: pos.clone(), t0: controls.target.clone(), t1: target.clone() };
}
controls.addEventListener('start', () => { tween = null; });

function partCenter(p, out) {
  if (p.anchorFn) return p.anchorFn(out);
  if (p.anchor) return out.copy(p.anchor).add(p.obj.position).sub(p.basePos).add(current.group.position).sub(current.group0);
  _b.makeEmpty().setFromObject(p.obj);
  return _b.isEmpty() ? p.obj.getWorldPosition(out) : _b.getCenter(out);
}

function focusPart(i) {
  const p = current.parts[i], c = partCenter(p, new THREE.Vector3());
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (p.view) dir.set(...p.view).normalize();
  const dist = THREE.MathUtils.clamp(p.dist ?? p.radius * 2.8, Math.max(controls.minDistance, 1.6), controls.maxDistance);
  flyTo(c.clone().addScaledVector(dir, dist), c, 1.4);
}

function resetView() {
  const c = current.def.camera;
  flyTo(new THREE.Vector3(...c.pos), new THREE.Vector3(...c.target), 1.6);
}

/* ---------- selección ---------- */
function select(i, fly = true) {
  sel = i;
  if (i < 0) { renderModelPanel(); } else { renderPartPanel(i); if (fly) focusPart(i); }
  document.querySelectorAll('.hs').forEach((h, k) => h.classList.toggle('sel', k === i));
}
function step(d) {
  const n = current.parts.length;
  select(sel < 0 ? (d > 0 ? 0 : n - 1) : (sel + d + n) % n);
}

/* ---------- materiales: resaltado / aislamiento / estructura ---------- */
function setWire(on) {
  wire = on;
  current?.parts.forEach((p) => p.mats.forEach((m) => { if ('wireframe' in m) m.wireframe = on; }));
  $('#b-wire')?.classList.toggle('on', on);
}
function applyStates(dt) {
  const k = Math.min(1, dt * 8);
  for (const p of current.parts) {
    p.glow += ((sel === p.index ? 1 : hover === p.index ? 0.5 : 0) - p.glow) * k;
    p.ghost += ((sel >= 0 && sel !== p.index ? 1 : 0) - p.ghost) * Math.min(1, dt * 6);
    const gh = p.ghost > 0.02;
    p.mats.forEach((m) => {
      const b = m.userData.base;
      if (m.emissive && b.emissive) { m.emissive.copy(b.emissive).lerp(ACC, p.glow * 0.5); m.emissiveIntensity = b.ei + p.glow * 0.6; }
      m.opacity = b.opacity * (1 - p.ghost * 0.82);
      const tr = b.transparent || gh;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
      m.depthWrite = b.depthWrite && p.ghost < 0.5;
    });
    p.obj.position.copy(p.basePos).addScaledVector(p.explode, expl);
  }
}

/* ---------- hotspots ---------- */
let hsEls = [];
function buildHotspots() {
  const box = $('#labels'); box.innerHTML = ''; box.classList.toggle('all', labelsOn);
  hsEls = current.parts.map((p, i) => {
    const el = document.createElement('button'); el.className = 'hs off';
    el.innerHTML = `<span class="dot"></span><span class="tag">${p.name}</span>`;
    el.onclick = () => select(i);
    el.onpointerenter = () => (hover = i); el.onpointerleave = () => (hover = -1);
    box.appendChild(el); return el;
  });
}
function updateHotspots() {
  const w = innerWidth, h = innerHeight;
  current.parts.forEach((p, i) => {
    partCenter(p, _v).project(camera);
    const vis = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05;
    const el = hsEls[i]; el.classList.toggle('off', !vis);
    if (vis) el.style.transform = `translate3d(${((_v.x + 1) / 2) * w}px,${((1 - _v.y) / 2) * h}px,0)`;
  });
}

/* ---------- picking ---------- */
const ray = new THREE.Raycaster();
ray.params.Points.threshold = 0.06; ray.params.Line.threshold = 0.08;
function pick(ev) {
  ray.setFromCamera(new THREE.Vector2((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(current.parts.map((p) => p.obj), true);
  let fallback = null;
  for (const h of hits) {
    let o = h.object; while (o && o.userData.partIndex === undefined) o = o.parent;
    if (!o) continue;
    if (current.parts[o.userData.partIndex].pickThrough) { fallback ||= { i: o.userData.partIndex, h }; continue; }
    return { i: o.userData.partIndex, h };
  }
  return fallback;
}
let down = null, moveQueued = false;
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const r = pick(e); select(r ? r.i : -1);
});
canvas.addEventListener('pointermove', (e) => {
  if (moveQueued || e.buttons) return; moveQueued = true;
  requestAnimationFrame(() => { moveQueued = false; const r = pick(e); hover = r ? r.i : -1; canvas.style.cursor = r ? 'pointer' : 'grab'; });
});
canvas.addEventListener('dblclick', (e) => {
  const r = pick(e); if (!r) return;
  const dir = camera.position.clone().sub(r.h.point), d = dir.length();
  flyTo(r.h.point.clone().addScaledVector(dir.normalize(), Math.max(0.9, d * 0.45)), r.h.point, 1.2);
});

/* ---------- UI ---------- */
const ICON = {
  prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', play: '<path d="M7 4l13 8-13 8z"/>',
  boom: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M5.6 18.4l3.5-3.5M14.9 9.1l3.5-3.5"/>',
  wire: '<path d="M12 3l9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
  rot: '<path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5"/>', home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
};
const ic = (n) => `<svg viewBox="0 0 24 24">${ICON[n]}</svg>`;
$('#dock').innerHTML = `
  <button id="b-prev" title="Parte anterior (←)">${ic('prev')}<b>Anterior</b></button>
  <button id="b-tour" title="Recorrido guiado (T)">${ic('play')}<b>Recorrido</b></button>
  <button id="b-next" title="Parte siguiente (→)"><b>Siguiente</b>${ic('next')}</button>
  <span class="sep"></span>
  <label class="slider" title="Vista explosionada (X)">${ic('boom')}<input id="r-expl" type="range" min="0" max="1" step="0.01" value="0"></label>
  <span class="sep"></span>
  <button id="b-wire" title="Estructura (G)">${ic('wire')}<b>Estructura</b></button>
  <button id="b-lab" title="Etiquetas (L)">${ic('tag')}<b>Etiquetas</b></button>
  <button id="b-rot" title="Rotación automática">${ic('rot')}<b>Girar</b></button>
  <button id="b-home" title="Restablecer vista (Esc)">${ic('home')}</button>`;
$('#b-prev').onclick = () => step(-1); $('#b-next').onclick = () => step(1);
$('#b-tour').onclick = toggleTour;
$('#r-expl').oninput = (e) => (explTarget = +e.target.value);
$('#b-wire').onclick = () => setWire(!wire);
$('#b-lab').onclick = toggleLabels;
$('#b-rot').onclick = () => { controls.autoRotate = !controls.autoRotate; $('#b-rot').classList.toggle('on', controls.autoRotate); };
$('#b-home').onclick = () => { select(-1); resetView(); };
$('#btnHelp').onclick = () => $('#help').classList.toggle('on');

function toggleTour() { tour = !tour; tourT = 99; $('#b-tour').classList.toggle('on', tour); }
function toggleLabels() { labelsOn = !labelsOn; $('#labels').classList.toggle('all', labelsOn); $('#b-lab').classList.toggle('on', labelsOn); }
function toggleExplode() { explTarget = explTarget > 0.5 ? 0 : 1; $('#r-expl').value = explTarget; }

let filter = 'todo';
function buildTabs() {
  $('#tabs').innerHTML = Object.entries(CATS).map(([k, v]) => `<button data-k="${k}" class="${k === filter ? 'on' : ''}"><span>${v}</span>${k === 'todo' ? '' : ''}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach((b) => (b.onclick = () => {
    filter = b.dataset.k;
    const list = MODELS.filter((m) => filter === 'todo' || m.category === filter);
    if (!list.includes(current.def)) loadModel(list[0].id); else { buildTabs(); buildRail(); }
  }));
}
function buildRail() {
  const list = MODELS.filter((m) => filter === 'todo' || m.category === filter);
  $('#rail').innerHTML = list.map((m, i) => `<button class="card ${m === current.def ? 'on' : ''}" style="--c:${m.accent};--i:${i}" data-id="${m.id}">${m.icon}<span>${m.name}</span></button>`).join('');
  $('#rail').querySelectorAll('.card').forEach((c) => (c.onclick = () => loadModel(c.dataset.id)));
}

function renderModelPanel() {
  const d = current.def;
  $('#panel').innerHTML = `
    <div><span class="chip">${CAT_NAME[d.category]}</span></div>
    <div><h1>${d.name}</h1><p class="latin">${d.latin}</p></div>
    <p class="lead">${d.summary}</p>
    <div class="stats">${d.stats.map(([l, v]) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
    <div><h3>Explora sus partes</h3><ol class="parts">${current.parts.map((p, i) => `<li><button data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i>${p.name}<em>→</em></button></li>`).join('')}</ol></div>
    <div><h3>¿Sabías que…?</h3><div class="facts">${d.curiosities.map((c) => `<article>${c}</article>`).join('')}</div></div>`;
  $('#panel').scrollTop = 0;
  $('#panel').querySelectorAll('.parts button').forEach((b) => (b.onclick = () => select(+b.dataset.i)));
}
function renderPartPanel(i) {
  const p = current.parts[i], n = current.parts.length;
  $('#panel').innerHTML = `
    <button class="back" id="back">← ${current.def.name}</button>
    <div><span class="chip">Parte ${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</span></div>
    <h2>${p.name}</h2>
    <p class="lead">${p.desc}</p>
    <ul class="bullets">${(p.facts || []).map((f) => `<li>${f}</li>`).join('')}</ul>
    ${p.fun ? `<div class="callout"><b>Dato curioso</b>${p.fun}</div>` : ''}
    <div class="pnav"><button id="pp">← Anterior</button><button id="pn">Siguiente →</button></div>`;
  $('#panel').scrollTop = 0;
  $('#back').onclick = () => { select(-1); resetView(); };
  $('#pp').onclick = () => step(-1); $('#pn').onclick = () => step(1);
}

/* ---------- teclado ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
  const k = e.key.toLowerCase();
  if (k === 'arrowright') step(1); else if (k === 'arrowleft') step(-1);
  else if (k === 'x') toggleExplode(); else if (k === 'g') setWire(!wire);
  else if (k === 'l') toggleLabels(); else if (k === 't') toggleTour();
  else if (k === 'h') $('#help').classList.toggle('on');
  else if (k === 'escape') { select(-1); resetView(); }
  else if (/^[1-9]$/.test(k) && MODELS[+k - 1]) loadModel(MODELS[+k - 1].id);
  else keys.add(k);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _m = new THREE.Vector3();
function fly(dt) {
  if (!keys.size) return;
  camera.getWorldDirection(_f); _r.crossVectors(_f, camera.up).normalize(); _m.set(0, 0, 0);
  if (keys.has('w')) _m.add(_f); if (keys.has('s')) _m.sub(_f);
  if (keys.has('d')) _m.add(_r); if (keys.has('a')) _m.sub(_r);
  if (keys.has('r')) _m.y += 1; if (keys.has('f')) _m.y -= 1;
  if (!_m.lengthSq()) return;
  tween = null;
  const speed = Math.max(1.5, camera.position.distanceTo(controls.target)) * 0.9;
  _m.normalize().multiplyScalar(speed * dt);
  camera.position.add(_m); controls.target.add(_m);
}

/* ---------- bucle ---------- */
const clock = new THREE.Clock(); let T = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05); T += dt;
  if (!current) return;
  fly(dt);
  if (tween) {
    tween.t += dt / tween.dur; const e = ease(Math.min(1, tween.t));
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (tween.t >= 1) tween = null;
  }
  if (tour && !tween && (tourT += dt) > 6) { tourT = 0; step(1); }
  controls.update();
  expl += (explTarget - expl) * Math.min(1, dt * 3);
  current.update(T, dt);
  applyStates(dt);
  dust.rotation.y += dt * 0.012;
  updateHotspots();
  composer.render();
}

const startId = location.hash.slice(1);
buildTabs();
loadModel(MODELS.some((m) => m.id === startId) ? startId : MODELS[0].id, true);
frame();
