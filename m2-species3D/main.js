import * as THREE from './vendor/three.module.js';
import { createGround } from './js/ground.js';
import { RipplePool, SparkPool, TrailPool } from './js/effects.js';
import { SlimeCreature } from './js/creature.js';
import { makeRadialTexture } from './js/slime.js';
import { Sky } from './js/sky.js';
import { Ruins } from './js/ruins.js';
import { FloatingDebris } from './js/debris.js';
import { BackgroundLife } from './js/life.js';
import { SunShafts, Dust } from './js/atmosphere.js';
import { Storm } from './js/storm.js';

/**
 * m2-species3D 入口。
 * 只做三件事：搭好 3D 舞台（相機 / 燈光 / 地面 / 廢墟天空）、建立生物、啟動渲染迴圈。
 * 生物的思考與走路全部封裝在 SlimeCreature 裡。
 */

const canvas = document.getElementById('scene');
const fade = document.getElementById('fade');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── 場景 ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
// 白天遠處的熱灰塵：所有東西最後都融進這片亮暖灰裡
scene.fog = new THREE.FogExp2(0xa79c8c, 0.0102);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  520
);
camera.position.set(0, 4.2, 9.8);

// 太陽在左後上方（畫面的左上角），高度低、角度斜
const sunDirection = new THREE.Vector3(-0.56, 0.13, -0.82).normalize();
const sunPosition = new THREE.Vector3(-46, 7.5, -62);

// 一張「中心亮、邊緣透明」的圓形貼圖，光暈、灰塵、火花與小生物都會用到
const glowTexture = makeRadialTexture(256);

// ── 天空 ──────────────────────────────────────────────────────────────
const sky = new Sky({ sunDirection });
scene.add(sky.mesh);

// ── 燈光：暖白陽光（逆光輪廓）+ 明亮天空補光 + 冷色輪廓 ────────────────
scene.add(new THREE.HemisphereLight(0xcfe2ee, 0x6d5f4a, 1.7));

const keyLight = new THREE.DirectionalLight(0xfff0d0, 3.6);
keyLight.position.set(-20, 16, -22);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8fd8ff, 0.9);
rimLight.position.set(10, 5.0, 7.0);
scene.add(rimLight);

const coolFill = new THREE.DirectionalLight(0x9db8d8, 0.5);
coolFill.position.set(-3, 5, 10);
scene.add(coolFill);

// ── 地面 ──────────────────────────────────────────────────────────────
const ground = createGround({ size: 200 });
scene.add(ground.mesh);

// ── 廢墟 ──────────────────────────────────────────────────────────────
const ruins = new Ruins({ seed: 20261112 });
scene.add(ruins.group);

// ── 漂浮的大型殘骸與土塊 ──────────────────────────────────────────────
// 直接沿用廢墟的材質，讓浮在空中的水泥塊和地上的廢墟是同一種石頭
const debris = new FloatingDebris({ materials: ruins.materials, seed: 20261113, count: 16 });
scene.add(debris.group);

// ── 在殘骸之間穿梭的小生物 ────────────────────────────────────────────
const life = new BackgroundLife({ glowTexture });
scene.add(life.group);

// ── 陽光光束與灰塵 ────────────────────────────────────────────────────
const shafts = new SunShafts({ count: 9, color: 0xffe2b4, sunPosition });
shafts.setTexture(glowTexture);
scene.add(shafts.group);

const dust = new Dust({ count: 900, texture: glowTexture });
scene.add(dust.points);

// ── 背景電磁風暴 ──────────────────────────────────────────────────────
const storm = new Storm(scene, { glowTexture, boltCount: 6 });

// ── 生物 ──────────────────────────────────────────────────────────────
const ripples = new RipplePool(scene, 16);
const sparks = new SparkPool(scene, glowTexture, 64);
const trail = new TrailPool(scene, 36);
const creature = new SlimeCreature({
  scene,
  ripples,
  sparks,
  trail,
  glowTexture,
  bounds: { x: [-4.0, 4.0], z: [-3.8, 2.5] },
});

// 出生時先朝鏡頭看一眼，再開始漫遊
creature.yaw = 0;

// ── 滑鼠 / 觸控：點地面就叫牠過去 ──────────────────────────────────────
// 用射線打在地面平面上，換算成世界座標再交給 creature.setDestination。
// 按住拖曳時也可以連續指定方向（有節流，避免每個 pointermove 都丟漣漪）。
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointerHit = new THREE.Vector3();

let pointerHeld = false;
let lastCommand = -1e9;

function groundPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, pointerHit)) return null;
  return pointerHit;
}

function commandAt(event, force = false) {
  const now = performance.now();
  if (!force && now - lastCommand < 70) return;
  const p = groundPointFromEvent(event);
  if (!p) return;
  lastCommand = now;
  creature.setDestination(p.x, p.z);
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  pointerHeld = true;
  canvas.setPointerCapture?.(event.pointerId);
  commandAt(event, true);
});

canvas.addEventListener('pointermove', (event) => {
  if (!pointerHeld) return;
  commandAt(event);
});

function releasePointer(event) {
  pointerHeld = false;
  if (event?.pointerId !== undefined) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 指標已經被放掉了，忽略
    }
  }
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
window.addEventListener('blur', () => releasePointer());

// ── 視窗縮放 ──────────────────────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ── 渲染迴圈 ──────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  creature.update(dt, time);
  ripples.update(dt);
  sparks.update(dt);
  trail.update(dt);
  storm.update(dt, time);
  shafts.update(time);
  dust.update(dt, time);
  debris.update(time);
  life.update(time);
  sky.update(time);
  ground.uniforms.uTime.value = time;

  // 鏡頭極緩慢地呼吸、側移，讓固定機位也有生命感
  camera.position.x = Math.sin(time * 0.11) * 0.34;
  camera.position.y = 4.2 + Math.sin(time * 0.17) * 0.1;
  camera.lookAt(0.06 * Math.sin(time * 0.08), 1.75, 0.25);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    fade?.classList.add('out');
  }

  requestAnimationFrame(animate);
}

animate();
