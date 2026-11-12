import * as THREE from '../vendor/three.module.js';
import { makeRandom, range } from './random.js';

/**
 * 用 Canvas 現畫的材質貼圖。
 *
 * 遠處的塔樓如果只有單色，會很像一塊塊色紙；加上這些貼圖之後，
 * 牆面就會有水泥斑駁、污漬、裂縫、窗戶與鏽蝕，遠景的資訊量會多很多。
 * 全部用 Canvas 2D 產生，不需要外部圖檔。
 */

function makeCanvas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function toTexture(canvas, { repeat = [1, 1] } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}

/** 斑駁的水泥牆：底色 + 大面積污漬 + 裂縫 + 剝落的小石粒 */
export function makeConcreteTexture(seed = 11) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rand = makeRandom(seed);

  ctx.fillStyle = '#7c8288';
  ctx.fillRect(0, 0, size, size);

  // 大面積的深淺變化
  for (let i = 0; i < 90; i++) {
    const r = range(rand, 30, 170);
    const g = ctx.createRadialGradient(
      rand() * size, rand() * size, 0,
      rand() * size, rand() * size, r
    );
    const dark = rand() > 0.5;
    g.addColorStop(0, dark ? 'rgba(55,60,64,0.20)' : 'rgba(150,156,160,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // 往下流的污漬
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const w = range(rand, 4, 26);
    const h = range(rand, 40, 220);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(42,46,48,0.26)');
    g.addColorStop(1, 'rgba(42,46,48,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, rand() * size * 0.6, w, h);
  }

  // 裂縫
  ctx.strokeStyle = 'rgba(38,42,44,0.55)';
  for (let i = 0; i < 16; i++) {
    ctx.lineWidth = range(rand, 0.6, 2.0);
    ctx.beginPath();
    let x = rand() * size;
    let y = rand() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      x += range(rand, -24, 24);
      y += range(rand, 8, 34);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 剝落的小石粒
  for (let i = 0; i < 900; i++) {
    const v = range(rand, 90, 150);
    ctx.fillStyle = `rgba(${v},${v + 2},${v},${range(rand, 0.08, 0.3)})`;
    ctx.fillRect(rand() * size, rand() * size, range(rand, 1, 4), range(rand, 1, 4));
  }

  return toTexture(canvas);
}

/** 塔樓立面：水泥底 + 一排排窗戶（有些破了、有些還亮著） */
export function makeFacadeTexture(seed = 23) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rand = makeRandom(seed);

  // 基底
  ctx.fillStyle = '#6d747a';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 60; i++) {
    const g = ctx.createRadialGradient(
      rand() * size, rand() * size, 0,
      rand() * size, rand() * size, range(rand, 30, 150)
    );
    g.addColorStop(0, rand() > 0.5 ? 'rgba(45,50,54,0.20)' : 'rgba(140,146,150,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // 窗戶：8 欄 x 10 列
  const cols = 8;
  const rows = 10;
  const cw = size / cols;
  const ch = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.24;
      const y = r * ch + ch * 0.24;
      const w = cw * 0.52;
      const h = ch * 0.46;
      const roll = rand();
      if (roll > 0.82) {
        // 還亮著的窗：淡淡的暖光
        ctx.fillStyle = `rgba(255,214,150,${range(rand, 0.35, 0.8)})`;
      } else if (roll > 0.30) {
        // 黑洞洞的窗
        ctx.fillStyle = 'rgba(22,26,29,0.9)';
      } else {
        // 破掉的窗：只剩框
        ctx.fillStyle = 'rgba(12,14,16,0.55)';
        ctx.fillRect(x, y, w, h);
        ctx.clearRect(x + w * 0.15, y + h * 0.1, w * 0.6, h * 0.5);
        continue;
      }
      ctx.fillRect(x, y, w, h);
    }
  }

  // 樓層橫帶
  ctx.fillStyle = 'rgba(40,44,47,0.5)';
  for (let r = 0; r <= rows; r++) {
    ctx.fillRect(0, r * ch - 1, size, 2.5);
  }

  // 污漬與裂縫
  for (let i = 0; i < 20; i++) {
    const x = rand() * size;
    const h = range(rand, 60, 240);
    const g = ctx.createLinearGradient(0, rand() * size * 0.5, 0, h);
    g.addColorStop(0, 'rgba(38,42,44,0.22)');
    g.addColorStop(1, 'rgba(38,42,44,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, range(rand, 6, 24), h);
  }

  return toTexture(canvas);
}

/** 鏽蝕的金屬：橘褐底色 + 深色鏽斑 + 垂直流痕 */
export function makeRustTexture(seed = 37) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rand = makeRandom(seed);

  ctx.fillStyle = '#6e4a34';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 130; i++) {
    const r = range(rand, 10, 90);
    const g = ctx.createRadialGradient(
      rand() * size, rand() * size, 0,
      rand() * size, rand() * size, r
    );
    const roll = rand();
    if (roll > 0.66) g.addColorStop(0, 'rgba(150,82,44,0.35)');
    else if (roll > 0.33) g.addColorStop(0, 'rgba(52,34,24,0.35)');
    else g.addColorStop(0, 'rgba(190,120,70,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // 直向的鏽水流痕
  for (let i = 0; i < 50; i++) {
    const g = ctx.createLinearGradient(0, 0, 0, range(rand, 40, 200));
    g.addColorStop(0, 'rgba(46,28,18,0.30)');
    g.addColorStop(1, 'rgba(46,28,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(rand() * size, rand() * size * 0.5, range(rand, 3, 12), size);
  }

  return toTexture(canvas);
}

/** 濕軟的泥土：深褐底 + 顆粒 + 小石頭（給漂浮的土塊用） */
export function makeSoilTexture(seed = 53) {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rand = makeRandom(seed);

  ctx.fillStyle = '#4a3b2c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2200; i++) {
    const v = range(rand, 40, 130);
    ctx.fillStyle = `rgba(${v + 18},${v},${v * 0.7},${range(rand, 0.12, 0.5)})`;
    ctx.fillRect(rand() * size, rand() * size, range(rand, 1, 5), range(rand, 1, 5));
  }

  // 幾顆比較亮的小石頭
  for (let i = 0; i < 120; i++) {
    const v = range(rand, 110, 165);
    ctx.fillStyle = `rgba(${v},${v - 4},${v - 16},${range(rand, 0.3, 0.65)})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, range(rand, 1, 4), 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas);
}
