/**
 * M2 物種 - 聚合物機械黏菌體 (Polymer-Gear Slime)
 * 
 * 核心架構：
 * 本版本已全面改由 Rust (WebAssembly) 高效能運算核心驅動！
 * 1. 物理模擬、反向運動學 (IK) 踏步步態、有機三角變形頂點、齒輪旋轉與黑洞超渡吞食邏輯 100% 於 Rust 內執行。
 * 2. 透過 WebAssembly 與 HTML5 Canvas 2D 極速渲染，徹底根絕以往 p5.js 大量頂點造成的畫面卡頓。
 * 3. 完美相容作業「對著 index.html 按 Live Preview 看結果」規範。
 */

import init, { WorldSimulation } from './pkg/m2_species.js';

let sim = null;
let canvas = null;
let ctx = null;

// DOM 元素引用
let hudPlayerTier, hudPlayerExp, hudExpBarFill, hudCreatureCount, hudWeather;
let sliderBrightness, sliderViscosity, sliderGearSpeed, sliderLightning, sliderRain, sliderElectric, selectWeather;
let lblBrightness, lblViscosity, lblGearSpeed, lblLightning, lblRain, lblElectric;

async function bootstrap() {
  // 初始化 Rust WebAssembly 模組
  await init();

  // 取得或建立全螢幕 Canvas
  canvas = document.getElementById('world-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'world-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';
    document.querySelector('main').appendChild(canvas);
  }

  ctx = canvas.getContext('2d');
  resizeCanvas();

  // 實例化 Rust 模擬世界
  sim = new WorldSimulation(canvas.width, canvas.height);

  // 綁定 HUD 與控制面板
  initControls();

  // 綁定滑鼠互動
  bindMouseEvents();

  // 視窗縮放監聽
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (sim) {
      sim.resize(canvas.width, canvas.height);
    }
  });

  // 啟動 60 FPS 極速渲染迴圈
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initControls() {
  hudPlayerTier = document.getElementById('player-tier');
  hudPlayerExp = document.getElementById('player-exp');
  hudExpBarFill = document.getElementById('exp-bar-fill');
  hudCreatureCount = document.getElementById('creature-count');
  hudWeather = document.getElementById('hud-weather');

  selectWeather = document.getElementById('weather-select');
  sliderBrightness = document.getElementById('bg-brightness');
  sliderViscosity = document.getElementById('slime-viscosity');
  sliderGearSpeed = document.getElementById('gear-speed');
  sliderLightning = document.getElementById('lightning-frequency');
  sliderRain = document.getElementById('rain-intensity');
  sliderElectric = document.getElementById('electric-frequency');

  lblBrightness = document.getElementById('val-brightness');
  lblViscosity = document.getElementById('val-viscosity');
  lblGearSpeed = document.getElementById('val-gear-speed');
  lblLightning = document.getElementById('val-lightning');
  lblRain = document.getElementById('val-rain');
  lblElectric = document.getElementById('val-electric');

  // 天氣選單
  if (selectWeather) {
    selectWeather.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'normal') {
        sliderRain.value = '0';
        sliderLightning.value = '0';
        sliderBrightness.value = '22';
        hudWeather.innerText = '乾燥常態';
      } else if (mode === 'amber-rain') {
        sliderRain.value = '3';
        sliderLightning.value = '2';
        sliderBrightness.value = '15';
        hudWeather.innerText = '微黏稠螢光橘雨';
      } else if (mode === 'freezing') {
        sliderRain.value = '0';
        sliderLightning.value = '0';
        sliderBrightness.value = '8';
        hudWeather.innerText = '夜間極凍死電期';
      }
      syncSlidersToSim();
    });
  }

  // 亮度滑桿
  if (sliderBrightness) {
    sliderBrightness.addEventListener('input', () => {
      lblBrightness.innerText = sliderBrightness.value;
      if (sim) sim.set_brightness(parseFloat(sliderBrightness.value));
    });
  }

  // 黏稠流動度
  if (sliderViscosity) {
    sliderViscosity.addEventListener('input', () => {
      lblViscosity.innerText = sliderViscosity.value;
      if (sim) sim.set_viscosity(parseFloat(sliderViscosity.value));
    });
  }

  // 齒輪轉速
  if (sliderGearSpeed) {
    sliderGearSpeed.addEventListener('input', () => {
      lblGearSpeed.innerText = sliderGearSpeed.value;
      if (sim) sim.set_gear_speed(parseFloat(sliderGearSpeed.value));
    });
  }

  // 閃電頻率
  if (sliderLightning) {
    const lightningTexts = ['無', '低頻', '中頻', '暴風高頻'];
    sliderLightning.addEventListener('input', () => {
      const val = parseInt(sliderLightning.value, 10);
      lblLightning.innerText = lightningTexts[val] || '低頻';
      if (sim) sim.set_lightning_freq(val);
    });
  }

  // 雨勢強度
  if (sliderRain) {
    const rainTexts = ['無雨', '細微小雨', '大雨', '暴雨傾盆', '末日橘雨'];
    sliderRain.addEventListener('input', () => {
      const val = parseInt(sliderRain.value, 10);
      lblRain.innerText = rainTexts[val] || '大雨';
      if (sim) sim.set_rain_intensity(val);
    });
  }

  // 散佈野生幼體
  const btnSpawn = document.getElementById('btn-spawn-random');
  if (btnSpawn) {
    btnSpawn.addEventListener('click', () => {
      if (sim) sim.spawn_random_food();
    });
  }

  // 重置母體
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (sim) sim.reset_alpha();
    });
  }

  syncSlidersToSim();
}

function syncSlidersToSim() {
  if (!sim) return;
  if (selectWeather) {
    sim.set_weather(selectWeather.value);
  }
  if (sliderBrightness) {
    lblBrightness.innerText = sliderBrightness.value;
    sim.set_brightness(parseFloat(sliderBrightness.value));
  }
  if (sliderViscosity) {
    lblViscosity.innerText = sliderViscosity.value;
    sim.set_viscosity(parseFloat(sliderViscosity.value));
  }
  if (sliderGearSpeed) {
    lblGearSpeed.innerText = sliderGearSpeed.value;
    sim.set_gear_speed(parseFloat(sliderGearSpeed.value));
  }
  if (sliderLightning) {
    const val = parseInt(sliderLightning.value, 10);
    const lightningTexts = ['無', '低頻', '中頻', '暴風高頻'];
    lblLightning.innerText = lightningTexts[val] || '低頻';
    sim.set_lightning_freq(val);
  }
  if (sliderRain) {
    const val = parseInt(sliderRain.value, 10);
    const rainTexts = ['無雨', '細微小雨', '大雨', '暴雨傾盆', '末日橘雨'];
    lblRain.innerText = rainTexts[val] || '大雨';
    sim.set_rain_intensity(val);
  }
}

function bindMouseEvents() {
  // 左鍵引導母體爬行
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      if (sim) sim.stimulate(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) {
      if (sim) sim.stimulate(e.clientX, e.clientY);
    }
  });

  // 右鍵投放幼體獵物
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (sim) sim.spawn_food(e.clientX, e.clientY);
  });

  // 觸控螢幕支援
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      if (sim) sim.stimulate(touch.clientX, touch.clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      if (sim) sim.stimulate(touch.clientX, touch.clientY);
    }
  }, { passive: true });
}

function gameLoop() {
  if (sim && ctx) {
    // 執行 Rust 高速物理與演算法更新
    sim.update();

    // 呼叫 Rust 高速 2D 畫布渲染
    sim.render(ctx);

    // 更新抬頭顯示 HUD
    updateHUD();
  }

  requestAnimationFrame(gameLoop);
}

function updateHUD() {
  if (!sim) return;

  if (hudPlayerTier) {
    hudPlayerTier.innerText = sim.get_player_tier_name();
  }

  const exp = sim.get_exp();
  const expNeeded = sim.get_exp_needed();
  if (hudPlayerExp) {
    hudPlayerExp.innerText = `${exp} / ${expNeeded} 隻`;
  }
  if (hudExpBarFill) {
    const pct = Math.min(100, Math.floor((exp / expNeeded) * 100));
    hudExpBarFill.style.width = `${pct}%`;
  }
  if (hudCreatureCount) {
    hudCreatureCount.innerText = sim.get_creature_count();
  }
}

// 啟動主程式
window.addEventListener('DOMContentLoaded', bootstrap);
