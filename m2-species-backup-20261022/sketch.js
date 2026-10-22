/**
 * M2 物種設計：八爪機械黏菌共生體 (Doc Ock Polymer Slime) - 奇異博士披肩流動、全域光影與螢光生物版
 * 
 * 核心升級：
 * 1. 奇異博士披肩流動感 (Cloak-like Undulating Dynamics)：生物移動時後方如披肩般翻飛波浪起伏，具備水銀水感。
 * 2. 俯視天候視角 (Top-down Perspective Weather)：
 *    - 螢光橘雨：短促微傾斜俯視雨痕，撞擊地面瞬間炸開擴散淡出的螢光橘水花漣漪。
 *    - 螢光極凍雪：微弱冷螢光青藍色 (Neon Frost Cyan) 冰晶，從上空緩慢旋轉擴大飄落。
 * 3. 背景動態光影系統 (Ambient Lighting)：
 *    - 緩慢平移飄過的巨型雲朵陰影 (Drifting Cloud Shadows)。
 *    - 冷冽白色斜射月光光斑 (Pale Moonlight Beams)。
 *    - 瞬間照亮全景的環境閃電白光 (Full-screen Lightning Flash)。
 * 4. 破格前爪錨定強拉 (Forceful Anchored Pull)：前爪遠遠甩向前方 3 倍半徑處死死釘地，將整個身體硬生生拉拽過去！
 * 5. 生物體表電絲 (Crawling Body Electrical Filaments)：隨機游走在體表黏液與齒輪之間的細微電弧。
 * 6. 水感不規則史萊姆本體 (Watery Amorphous Slime)：多節點流體形變，表面張力水感強烈。
 * 7. 螢光發光器官 (Bioluminescent Neon Glands)：體內發光的螢光青藍與螢光橘色生物腺體。
 */

let creatures = [];
let ambientSurges = [];
let amberRaindrops = [];
let rainSplashes = [];
let snowParticles = [];
let dustParticles = [];

// 玩家導引目標與單次跳動光標
let playerTarget = null;
let targetPing = null;

// 背景動態光影狀態
let cloudOffsetX = 0;
let cloudOffsetY = 0;
let lightningFlash = 0; // 全域閃電亮度
let lightningDecay = 0.78;
let lightningBursts = 0;
let preyResidues = []; // 捕食後殘留物
let sunOcclusion = 0.35; // 太陽被雲遮蔽的程度（0~1），越大全域光越弱
let cloudShadows = []; // 動態漫游雲影群

let ui = {};

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent(document.querySelector('main'));

  setupUIControls();
  initAtmosphericParticles();
  initCloudShadows();

  // 初始純淨單體：只生成玩家主控母體 1 隻
  let alpha = new SlimeCreature(width / 2, height / 2, 3);
  creatures.push(alpha);
}

function draw() {
  let bgVal = ui.brightness ? Number(ui.brightness.value) : 18;
  let weather = ui.weather ? ui.weather.value : 'normal';

  // 1. 繪製廢土場景（包含倒塌巨構、地表裂隙、月光光束、雲朵陰影與全域閃電）
  drawAtmosphericWasteland(bgVal, weather);

  // 2. 處理天候特效（符合俯視角度與螢光設定）
  handleWeatherEffects(weather);

  // 3. 背景低頻地底殘存電網竄動
  handleAmbientElectricity(weather);

  // 4. 繪製單次跳動目標光標（跳一次即淡出）
  drawOneShotTargetPing();

  // 5. 處理生態階級搜尋、觸手抓捕與拖拽吞噬
  handlePredationSystem();
  updatePreyResidues();

  // 5.5 繪製獵物殘留物
  drawPreyResidues();

  // 6. 更新並繪製所有生物個體
  for (let i = creatures.length - 1; i >= 0; i--) {
    let c = creatures[i];
    let isAlpha = (c === getAlphaCreature());
    c.update(isAlpha);
    c.display(isAlpha);
  }

  // 7. 更新 HUD
  updateHUDText();
}

// ----------------------------------------------------
// 取得主控母體
// ----------------------------------------------------
function getAlphaCreature() {
  if (creatures.length === 0) return null;
  let alpha = creatures[0];
  for (let c of creatures) {
    if (c.tier > alpha.tier || (c.tier === alpha.tier && c.exp > alpha.exp)) {
      alpha = c;
    }
  }
  return alpha;
}

// ----------------------------------------------------
// UI 控制面板初始化與監聽
// ----------------------------------------------------
function setupUIControls() {
  ui.weather = document.getElementById('weather-select');
  ui.brightness = document.getElementById('bg-brightness');
  ui.viscosity = document.getElementById('slime-viscosity');
  ui.gearSpeed = document.getElementById('gear-speed');
  ui.electric = document.getElementById('electric-frequency');
  ui.lightning = document.getElementById('lightning-frequency');
  ui.rain = document.getElementById('rain-intensity');

  if (ui.brightness) {
    ui.brightness.addEventListener('input', e => {
      document.getElementById('val-brightness').innerText = e.target.value;
    });
  }
  if (ui.viscosity) {
    ui.viscosity.addEventListener('input', e => {
      document.getElementById('val-viscosity').innerText = e.target.value;
    });
  }
  if (ui.gearSpeed) {
    ui.gearSpeed.addEventListener('input', e => {
      document.getElementById('val-gear-speed').innerText = e.target.value;
    });
  }
  if (ui.electric) {
    const labels = ['關閉', '低頻', '中頻', '高頻'];
    ui.electric.addEventListener('input', e => {
      document.getElementById('val-electric').innerText = labels[e.target.value] || '低頻';
    });
  }
  if (ui.lightning) {
    const labels = ['關閉', '低頻', '中頻', '高頻'];
    ui.lightning.addEventListener('input', e => {
      document.getElementById('val-lightning').innerText = labels[e.target.value] || '低頻';
    });
  }
  if (ui.rain) {
    const labels = ['毛毛雨', '小雨', '中雨', '大雨', '暴雨'];
    ui.rain.addEventListener('input', e => {
      document.getElementById('val-rain').innerText = labels[e.target.value] || '中雨';
    });
  }

  const spawnBtn = document.getElementById('btn-spawn-random');
  if (spawnBtn) {
    spawnBtn.addEventListener('click', () => {
      for (let i = 0; i < 3; i++) {
        let rx = random(width * 0.1, width * 0.9);
        let ry = random(height * 0.1, height * 0.9);
        creatures.push(new SlimeCreature(rx, ry, 1));
      }
    });
  }

  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      creatures = [];
      creatures.push(new SlimeCreature(width / 2, height / 2, 3));
      playerTarget = null;
      targetPing = null;
    });
  }
}

// ----------------------------------------------------
// 滑鼠操作：左鍵導引母體、右鍵投放食物
// ----------------------------------------------------
function mousePressed(e) {
  const panel = document.getElementById('control-panel');
  if (panel && panel.contains(e.target)) return;

  if (mouseButton === LEFT) {
    playerTarget = createVector(mouseX, mouseY);
    targetPing = { x: mouseX, y: mouseY, r: 8, alpha: 255 };

    let alpha = getAlphaCreature();
    if (alpha) {
      alpha.setTarget(playerTarget.x, playerTarget.y);
      alpha.emitSparks(0, 0, 8);
    }
  } else if (mouseButton === RIGHT) {
    let prey = new SlimeCreature(mouseX, mouseY, 1);
    prey.emitSparks(0, 0, 10);
    creatures.push(prey);
  }
}

// ----------------------------------------------------
// 單次跳動光標 (One-Shot Ping)
// ----------------------------------------------------
function drawOneShotTargetPing() {
  if (!targetPing) return;

  push();
  noFill();
  stroke(255, 140, 30, targetPing.alpha);
  strokeWeight(2.2);
  circle(targetPing.x, targetPing.y, targetPing.r * 2);

  stroke(100, 210, 255, targetPing.alpha * 0.85);
  strokeWeight(1.2);
  let crossLen = targetPing.r * 0.8;
  line(targetPing.x - crossLen, targetPing.y, targetPing.x + crossLen, targetPing.y);
  line(targetPing.x, targetPing.y - crossLen, targetPing.x, targetPing.y + crossLen);
  pop();

  targetPing.r += 1.8;
  targetPing.alpha -= 14;

  if (targetPing.alpha <= 0) {
    targetPing = null;
  }
}

// ----------------------------------------------------
// 廢土場景大氣繪製 (包含雲影、月光光束與閃電全域光)
// ----------------------------------------------------
function drawAtmosphericWasteland(bgVal, weather) {
  let rBase = bgVal;
  let gBase = bgVal + 1;
  let bBase = bgVal + 3;

  if (weather === 'freezing') {
    rBase *= 0.55; gBase *= 0.7; bBase *= 1.25;
  } else if (weather === 'amber-rain') {
    rBase += 8; gBase += 3; bBase -= 3;
  }
  background(rBase, gBase, bBase);

  // 1. 遠景：倒塌摩天巨構鋼骨剪影
  noStroke();
  fill(weather === 'freezing' ? color(rBase + 6, gBase + 9, bBase + 16, 140) : color(rBase + 4, gBase + 5, bBase + 7, 130));
  quad(width * 0.05, height, width * 0.18, height, width * 0.26, height * 0.15, width * 0.14, height * 0.15);
  quad(width * 0.78, height, width * 0.94, height, width * 0.86, height * 0.08, width * 0.72, height * 0.08);

  stroke(rBase + 10, gBase + 12, bBase + 18, 100);
  strokeWeight(1.5);
  line(width * 0.08, height * 0.8, width * 0.22, height * 0.4);
  line(width * 0.12, height * 0.6, width * 0.24, height * 0.25);
  line(width * 0.76, height * 0.7, width * 0.9, height * 0.3);

  // 2. 中景：地表裂隙熱液光芒
  let crackGlow = (weather === 'amber-rain') ? color(255, 130, 20, 110) : (weather === 'freezing' ? color(0, 229, 255, 55) : color(220, 100, 20, 50));
  stroke(crackGlow);
  strokeWeight(3.8);
  line(width * 0.25, height * 0.88, width * 0.42, height * 0.78);
  line(width * 0.42, height * 0.78, width * 0.55, height * 0.84);
  line(width * 0.65, height * 0.22, width * 0.78, height * 0.32);

  // 3. 近景：地底弱電電網（帶輕微電壓脈動，避免死板）
  let gridPulse = 0.5 + 0.5 * sin(frameCount * 0.022);
  let gridAlpha = 55 + 35 * gridPulse;
  let gridCol = (weather === 'freezing') ? color(rBase + 16, gBase + 22, bBase + 35, gridAlpha) : color(rBase + 9, gBase + 11, bBase + 15, gridAlpha * 0.8);
  stroke(gridCol);
  strokeWeight(1);
  const step = 85;
  for (let x = 0; x < width; x += step) line(x, 0, x, height);
  for (let y = 0; y < height; y += step) line(0, y, width, y);

  noStroke();
  fill(rBase + 18, gBase + 20, bBase + 26, 40 + 55 * gridPulse);
  for (let x = step / 2; x < width; x += step * 2) {
    for (let y = step / 2; y < height; y += step * 2) {
      circle(x, y, 2.8 + 1.2 * gridPulse);
    }
  }

  // 4. 動態光影：全場緩慢飄移的雲朵陰影群 (Drifting Cloud Shadows)
  // 太陽遮蔽程度：依雲影位置做平滑變化，避免光影突兀跳動
  let targetOcclusion = 0.28 + 0.52 * (0.5 + 0.5 * sin(frameCount * 0.022));
  sunOcclusion = lerp(sunOcclusion, targetOcclusion, 0.09);

  push();
  noStroke();
  for (let cs of cloudShadows) {
    cs.x += cs.speedX * 2.4;
    cs.y += cs.speedY * 2.4;
    if (cs.x - cs.rx > width) cs.x = -cs.rx;
    if (cs.y - cs.ry > height) cs.y = -cs.ry;

    // 柔和羽化：多層同心橢圓，模擬雲朵邊緣漸變（陽光被雲遮蔽的感覺）
    let baseAlpha = 18 + 16 * (1 - sunOcclusion);
    for (let k = 3; k >= 0; k--) {
      let scale = 1 + k * 0.12;
      let alpha = (baseAlpha * (4 - k)) / 4;
      fill(4, 6, 9, alpha);
      ellipse(cs.x, cs.y, cs.rx * 2 * scale, cs.ry * 2 * scale);
    }
    // 雲核較深
    fill(2, 3, 6, 26 + 18 * sunOcclusion);
    ellipse(cs.x + 22, cs.y + 12, cs.rx * 1.35, cs.ry * 1.2);
  }

  // 全域陽光被雲遮蔽的柔光遮罩
  fill(6, 8, 12, 26 + sunOcclusion * 46);
  rect(0, 0, width, height);
  pop();

  // 4.5 動態大氣霧氣：緩慢漂移的柔光霧團，讓整體背景不固定
  push();
  blendMode(ADD);
  noStroke();
  let fogCol = (weather === 'freezing') ? [0, 200, 255] : (weather === 'amber-rain' ? [255, 150, 40] : [130, 160, 200]);
  for (let i = 0; i < 6; i++) {
    let fx = (frameCount * (0.18 + i * 0.05) + i * 320) % (width + 500) - 250;
    let fy = height * 0.18 + i * height * 0.13 + sin(frameCount * 0.006 + i * 1.7) * height * 0.12;
    let fr = 160 + noise(i * 1.3, frameCount * 0.0025) * 220;
    fill(fogCol[0], fogCol[1], fogCol[2], 8 + 6 * (1 - sunOcclusion));
    ellipse(fx, fy, fr * 2.6, fr * 1.5);
  }
  blendMode(BLEND);
  pop();

  // 5. 光影：草原頂光 + 雲影經過遮擋（移除聚光燈式斜射光束）
  if (weather !== 'amber-rain') {
    push();
    noStroke();
    let occ = 1 - sunOcclusion * 0.72;

    // 從上往下灑落的整體柔光
    fill(225, 238, 255, 9 * occ);
    rect(0, 0, width, height);

    // 不規則移動陽光斑：共同方向平移 + 不規則 amoeba 形狀
    let patchDirX = (frameCount * 0.012) % (TWO_PI);
    // 多個巨大不規則陽光斑：共同向右緩慢漂移，會消失在畫面外再重新進入
    let driftX = (frameCount * 0.35) % (width + 900) - 450;
    for (let i = 0; i < 4; i++) {
      let phase = i * 1.37 + frameCount * 0.0012;
      let lx = driftX + i * 260 + sin(phase) * 220 + noise(i * 0.9, frameCount * 0.0015) * 260 - 130;
      let ly = height * 0.45 + (i - 3) * 90 + cos(phase * 0.7) * 150 + noise(i * 2.1, frameCount * 0.0015) * 140 - 70;
      let lr = 320 + noise(i * 1.3, frameCount * 0.002) * 420;
      fill(255, 242, 195, (7.0 - (i % 3) * 0.9) * occ);
      ellipse(lx, ly, lr * 3.0, lr * 2.2);
      fill(246, 228, 165, (3.2 + (i % 2) * 0.9) * occ);
      ellipse(lx + lr * 0.3, ly - lr * 0.2, lr * 1.3, lr * 1.0);
    }

    // 移動柔光斑：以噪波變形的多層柔邊光斑緩慢掃過，取代垂直矩形光的機械感
    let sweepCycle = (width + 700);
    let sweepX = (frameCount * 0.42) % sweepCycle - 350;
    let sweepY = height * 0.5 + sin(frameCount * 0.004) * height * 0.22;
    let sweepAlpha = (5 + 15 * max(0, sin(frameCount * 0.0021))) * occ;
    if (sweepAlpha > 1.5) {
      push();
      noStroke();
      translate(sweepX, sweepY);
      rotate(frameCount * 0.0012);
      // 多層偏移橢圓，造出不規則柔邊光斑
      for (let k = 7; k >= 0; k--) {
        let rr = 55 + k * 42 + noise(k * 0.7, frameCount * 0.0025) * 55;
        let ox = (noise(k * 1.3, frameCount * 0.0018) - 0.5) * 70;
        let oy = (noise(k * 2.1, frameCount * 0.0018) - 0.5) * 55;
        fill(255, 246, 215, sweepAlpha * (8 - k) / 8 * 0.75);
        ellipse(ox, oy, rr * 2.6, rr * 1.9);
      }
      // 高亮核心
      fill(255, 252, 235, sweepAlpha * 1.1);
      ellipse(0, 0, 95, 72);
      pop();
    }

    // 垂直方向微弱的漫射亮斑，模擬頂光散射（非矩形聚光）
    fill(240, 250, 255, 5 * occ);
    ellipse(width * 0.38, height * 0.18, width * 0.75, height * 0.45);
    fill(240, 250, 255, 4 * occ);
    ellipse(width * 0.62, height * 0.62, width * 0.85, height * 0.5);
    pop();
  }

  // 6. 全域閃電（不規則：串閃、亮度與持續長短都會不同）
  let lightningLevel = ui.lightning ? Number(ui.lightning.value) : 1;
  let lightningProbs = [0, 0.0012, 0.0032, 0.0075];
  // 用 ?? 避免等級 0 被 || 誤判成未設定
  let lightningProb = lightningProbs[lightningLevel] ?? 0.0032;
  let weatherFactorLightning = (weather === 'freezing') ? 0.5 : (weather === 'amber-rain' ? 1.35 : 1.0);
  lightningProb *= weatherFactorLightning;

  // 等級 0 = 完全關閉：取消任何進行中的閃電
  if (lightningLevel === 0) {
    lightningFlash = 0;
    lightningBursts = 0;
  }

  if (lightningFlash <= 0) {
    lightningFlash = 0;
    // 頻率由 bar 控制，可串閃、亮度與時長隨機
    if (lightningLevel > 0 && random(1) < lightningProb) {
      lightningFlash = random(100, 235);
      lightningDecay = random(0.6, 0.88);
      lightningBursts = int(random(1, lightningLevel === 3 ? 5 : 3));
    }
  } else {
    // 閃爍微擾：亮度有輕微抖動，避免機械感
    let flicker = 1 + random(-0.08, 0.08);
    fill(235, 245, 255, constrain(lightningFlash * flicker, 0, 255));
    rect(0, 0, width, height);

    lightningFlash *= lightningDecay;
    // 衰減到很低時，決定是否接續下一閃（串閃），且亮度/衰減重新隨機
    if (lightningFlash < 6 && lightningBursts > 1) {
      lightningBursts--;
      lightningFlash = random(45, 190);
      lightningDecay = random(0.7, 0.92);
    } else if (lightningFlash < 4) {
      lightningFlash = 0;
      lightningBursts = 0;
    }
  }
}

// ----------------------------------------------------
// 初始化動態漫游雲影
// ----------------------------------------------------
function initCloudShadows() {
  cloudShadows = [
    { x: width * 0.05, y: height * 0.15, rx: width * 0.35, ry: height * 0.22, speedX: 0.45, speedY: 0.12 },
    { x: width * 0.45, y: height * 0.05, rx: width * 0.5, ry: height * 0.28, speedX: 0.38, speedY: 0.1 },
    { x: width * 0.8, y: height * 0.35, rx: width * 0.42, ry: height * 0.25, speedX: 0.5, speedY: 0.14 },
    { x: -width * 0.1, y: height * 0.55, rx: width * 0.48, ry: height * 0.3, speedX: 0.42, speedY: 0.11 },
    { x: width * 0.25, y: height * 0.78, rx: width * 0.46, ry: height * 0.27, speedX: 0.4, speedY: 0.09 },
    { x: width * 0.7, y: height * 0.88, rx: width * 0.4, ry: height * 0.24, speedX: 0.44, speedY: 0.13 }
  ];
}

// ----------------------------------------------------
// 俯視天候粒子系統（特定螢光色：橘雨、冷藍雪花）
// ----------------------------------------------------
function initAtmosphericParticles() {
  dustParticles = [];
  for (let i = 0; i < 35; i++) {
    dustParticles.push({
      x: random(width), y: random(height),
      vx: random(-0.25, 0.25), vy: random(-0.35, 0.1),
      size: random(1.5, 3.5), alpha: random(50, 150), isAmber: random() > 0.6
    });
  }

  // 俯視冷螢光青藍雪花
  snowParticles = [];
  for (let i = 0; i < 70; i++) {
    snowParticles.push({
      x: random(width), y: random(height),
      angle: random(TWO_PI),
      rotSpeed: random(-0.02, 0.02),
      speed: random(1.8, 4.2),
      size: random(2.0, 5.5),
      alpha: random(130, 240)
    });
  }
}

function handleWeatherEffects(weather) {
  // 1. 午後微黏稠螢光橘雨（俯視雨痕＋地面漣漪）
  if (weather === 'amber-rain') {
    let rainLevel = ui.rain ? Number(ui.rain.value) : 2;
    let rainMaxDrops = [30, 60, 120, 200, 340][rainLevel] ?? 120;
    let rainSplashProb = [0.008, 0.016, 0.028, 0.042, 0.062][rainLevel] ?? 0.028;
    let rainMaxSplashes = [20, 35, 50, 70, 95][rainLevel] ?? 50;

    // 依滑桿調整雨量：超過上限時移除多餘雨滴，讓強度立即對應
    while (amberRaindrops.length > rainMaxDrops) {
      amberRaindrops.splice(int(random(amberRaindrops.length)), 1);
    }

    if (amberRaindrops.length < rainMaxDrops) {
      amberRaindrops.push({
        x: random(width), y: random(height),
        ang: PI * 0.28, // 俯視輕微斜落，角度一致
        len: random(6, 12),
        speed: random(9, 13),
        thickness: random(1.2, 2.4),
        alpha: random(160, 235),
        glow: random(0.5, 1.0)
      });
    }

    blendMode(ADD);
    for (let i = amberRaindrops.length - 1; i >= 0; i--) {
      let drop = amberRaindrops[i];
      if (!drop.ang) drop.ang = PI * 0.28;
      let dx = cos(drop.ang);
      let dy = sin(drop.ang);
      // 速度整體不要太快： limitation 9~13
      drop.speed = Math.min(drop.speed, 13);
      drop.x += dx * drop.speed;
      drop.y += dy * drop.speed;

      // 螢光外暈（明顯發光）
      stroke(255, 120, 20, drop.alpha * 0.35 * drop.glow);
      strokeWeight(drop.thickness * 3.2);
      line(drop.x, drop.y, drop.x - dx * drop.len, drop.y - dy * drop.len);

      // 螢光核心
      stroke(255, 180, 60, drop.alpha);
      strokeWeight(drop.thickness);
      line(drop.x, drop.y, drop.x - dx * drop.len, drop.y - dy * drop.len);

      // 雨滴頭部高亮點
      noStroke();
      fill(255, 220, 120, drop.alpha * 0.9);
      circle(drop.x, drop.y, drop.thickness * 2.6);

      // 大部分雨在畫面內碰到地面就炸開漣漪；落點到達外側則重置，避免只有少數落地
      let landed = (random(1) < (rainSplashProb * 0.75 + 0.02));
      let inBounds = (drop.x >= 0 && drop.x <= width && drop.y >= 0 && drop.y <= height);
      let exited = (drop.x > width + 10 || drop.x < -10 || drop.y > height + 10 || drop.y < -10);

      if (landed || exited) {
        if (inBounds && rainSplashes.length < rainMaxSplashes) {
          rainSplashes.push({
            x: drop.x, y: drop.y,
            r: 1, maxR: random(12, 28),
            alpha: random(180, 255)
          });
        }
        // 重置雨滴：從上緣或左緣進入，讓更多雨能在畫面內落地
        if (random() < 0.55) {
          drop.x = random(width);
          drop.y = random(-100, -15);
        } else {
          drop.x = random(-100, -15);
          drop.y = random(-40, height * 0.7);
        }
        if (!drop.ang) drop.ang = PI * 0.28;
        drop.speed = random(9, 13);
        drop.alpha = random(160, 235);
        drop.glow = random(0.5, 1.0);
      }
    }
    blendMode(BLEND);

    // 俯視水花漣漪（近圓形擴散 + 放射光芒）
    blendMode(ADD);
    for (let i = rainSplashes.length - 1; i >= 0; i--) {
      let sp = rainSplashes[i];
      sp.r += 1.5;
      sp.alpha -= 10.5;
      noFill();
      // 多層柔漣漪（俯視橢圓），去掉放射線避免雜亂
      stroke(255, 150, 30, sp.alpha * 0.8);
      strokeWeight(2.0);
      ellipse(sp.x, sp.y, sp.r * 2.3, sp.r * 1.55);
      stroke(255, 200, 90, sp.alpha * 0.5);
      strokeWeight(1.2);
      ellipse(sp.x, sp.y, sp.r * 1.5, sp.r * 1.0);
      stroke(255, 235, 160, sp.alpha * 0.25);
      strokeWeight(0.9);
      ellipse(sp.x, sp.y, sp.r * 0.8, sp.r * 0.55);
      if (sp.alpha <= 0) rainSplashes.splice(i, 1);
    }
    blendMode(BLEND);
  }
  // 2. 夜間極凍死電期：俯視飄落的冷螢光青藍冰晶雪花 (Neon Frost Cyan)
  else if (weather === 'freezing') {
    noStroke();
    let driftAngle = PI * 0.3;
    let dx = cos(driftAngle);
    let dy = sin(driftAngle);

    for (let s of snowParticles) {
      s.x += dx * s.speed + sin(frameCount * 0.02 + s.angle) * 0.8;
      s.y += dy * s.speed + cos(frameCount * 0.02 + s.angle) * 0.6;
      s.angle += s.rotSpeed;

      if (s.x > width + 20) s.x = -20;
      if (s.x < -20) s.x = width + 20;
      if (s.y > height + 20) s.y = -20;

      // 冷螢光青藍冰晶色 (Neon Cyan)
      fill(0, 229, 255, s.alpha);
      circle(s.x, s.y, s.size);

      // 冰晶高光核心
      fill(240, 255, 255, s.alpha * 0.9);
      circle(s.x, s.y, s.size * 0.45);
    }
  }
  // 3. 乾燥常態
  else {
    noStroke();
    for (let p of dustParticles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;

      fill(p.isAmber ? color(255, 140, 40, p.alpha) : color(140, 160, 190, p.alpha * 0.8));
      circle(p.x, p.y, p.size);
    }
  }
}

// ----------------------------------------------------
// 背景低頻電弧系統
// ----------------------------------------------------
function handleAmbientElectricity(weather) {
  let freqLevel = ui.electric ? Number(ui.electric.value) : 1;
  if (freqLevel === 0) return;

  let weatherFactor = (weather === 'freezing') ? 0.25 : (weather === 'amber-rain' ? 1.5 : 1.0);
  let triggerProb = ([0, 0.003, 0.008, 0.018][freqLevel] || 0.003) * weatherFactor;

  if (random(1) < triggerProb && ambientSurges.length < 2) {
    ambientSurges.push(new ElectricSurge());
  }

  for (let i = ambientSurges.length - 1; i >= 0; i--) {
    ambientSurges[i].update();
    ambientSurges[i].display();
    if (ambientSurges[i].isDead()) {
      ambientSurges.splice(i, 1);
    }
  }
}

class ElectricSurge {
  constructor() {
    this.points = [];
    this.branches = [];
    this.life = 255;
    this.decay = random(8, 16);
    this.surgeColor = random() > 0.4 ? color(90, 180, 255) : color(255, 140, 40);

    let start = createVector(random(width * 0.1, width * 0.9), random(height * 0.1, height * 0.9));
    let dir = p5.Vector.random2D();
    let current = start.copy();
    this.points.push(current.copy());

    let segCount = int(random(6, 11));
    for (let i = 0; i < segCount; i++) {
      let stepLen = random(20, 50);
      let stepDir = p5.Vector.add(dir, p5.Vector.random2D().mult(0.6)).normalize();
      current.add(p5.Vector.mult(stepDir, stepLen));
      this.points.push(current.copy());

      if (random(1) < 0.3) {
        let branchEnd = p5.Vector.add(current, p5.Vector.random2D().mult(random(25, 45)));
        this.branches.push({ start: current.copy(), end: branchEnd });
      }
    }
  }

  update() {
    this.life -= this.decay;
  }

  isDead() {
    return this.life <= 0;
  }

  display() {
    let alpha = this.life;
    stroke(red(this.surgeColor), green(this.surgeColor), blue(this.surgeColor), alpha * 0.7);
    strokeWeight(1.8);
    noFill();

    beginShape();
    for (let pt of this.points) {
      vertex(pt.x + random(-1, 1), pt.y + random(-1, 1));
    }
    endShape();

    strokeWeight(1.0);
    stroke(red(this.surgeColor), green(this.surgeColor), blue(this.surgeColor), alpha * 0.45);
    for (let b of this.branches) {
      line(b.start.x, b.start.y, b.end.x, b.end.y);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ----------------------------------------------------
// 生態階級搜尋與抓捕系統
// ----------------------------------------------------
function handlePredationSystem() {
  for (let i = creatures.length - 1; i >= 0; i--) {
    let predator = creatures[i];
    let isAlpha = (predator === getAlphaCreature());

    if (!isAlpha) {
      let closestPrey = null;
      let minDist = 380;

      for (let other of creatures) {
        if (other !== predator && other.tier < predator.tier && !other.isCaptured) {
          let d = dist(predator.pos.x, predator.pos.y, other.pos.x, other.pos.y);
          if (d < minDist) {
            minDist = d;
            closestPrey = other;
          }
        }
      }

      if (closestPrey) {
        predator.setTarget(closestPrey.pos.x, closestPrey.pos.y);
      }
    }

    for (let j = creatures.length - 1; j >= 0; j--) {
      if (i === j || i >= creatures.length || j >= creatures.length) continue;

      let c1 = creatures[i];
      let c2 = creatures[j];

      if (c1.tier > c2.tier && !c2.isCaptured) {
        let d = dist(c1.pos.x, c1.pos.y, c2.pos.x, c2.pos.y);
        let grabRange = c1.baseRadius * 6.5;

        if (d < grabRange && !c1.feedingTarget) {
          c2.isCaptured = true;
          c1.feedingTarget = c2;
          c1.foraging = false;
          c1.idleTimer = 0;
          c1.emitSparks(c2.pos.x - c1.pos.x, c2.pos.y - c1.pos.y, 16);
        }
      }
    }
  }
}

function updatePreyResidues() {
  for (let i = preyResidues.length - 1; i >= 0; i--) {
    let res = preyResidues[i];
    res.life--;
    if (res.life <= 0) preyResidues.splice(i, 1);
  }
}

function drawPreyResidues() {
  push();
  noStroke();
  for (let res of preyResidues) {
    let alpha = map(res.life, 0, res.maxLife, 0, 200);
    fill(20, 24, 28, alpha);
    ellipse(res.x, res.y, res.size * 2.6, res.size * 1.7);
    fill(45, 55, 60, alpha * 0.8);
    ellipse(res.x, res.y, res.size * 1.8, res.size * 1.1);
    fill(90, 200, 180, alpha * 0.25);
    ellipse(res.x, res.y, res.size * 3.2, res.size * 2.0);
  }
  pop();
}

function updateHUDText() {
  const alpha = getAlphaCreature();
  const countElement = document.getElementById('creature-count');
  const weatherElement = document.getElementById('hud-weather');
  const tierElement = document.getElementById('player-tier');
  const expElement = document.getElementById('player-exp');
  const expFill = document.getElementById('exp-bar-fill');

  if (countElement) {
    countElement.innerText = creatures.length;
  }

  if (alpha) {
    if (tierElement) {
      const tierNames = [
        '',
        'Tier 1 幼體 (3 爪)',
        'Tier 2 小獵食者 (4 爪)',
        'Tier 3 掠食者 (5 爪)',
        'Tier 4 巨獸 (6 爪)',
        'Tier 5 瘴巨體 (7 爪)',
        'Tier 6 霸主 (8 爪)',
        'Tier 7 毀滅體 (9 爪)',
        'Tier 8 犖城镇 (10 爪)',
        'Tier 9 終焉體 (11 爪)',
        'Tier 10 巨神 (12 爪)'
      ];
      tierElement.innerText = tierNames[alpha.tier] || `Tier ${alpha.tier} 巨神`;
    }

    if (expElement && expFill) {
      if (alpha.tier >= 10) {
        expElement.innerText = '已晉升至巨神形態！';
        expFill.style.width = '100%';
      } else {
        expElement.innerText = `${alpha.exp} / ${alpha.expToNext} 隻`;
        let pct = (alpha.exp / alpha.expToNext) * 100;
        expFill.style.width = pct + '%';
      }
    }
  }

  if (weatherElement && ui.weather) {
    const wMap = {
      'normal': '乾燥廢土常態',
      'amber-rain': '午後微黏稠螢光橘雨 ☔',
      'freezing': '夜間極凍死電期 ❄️'
    };
    weatherElement.innerText = wMap[ui.weather.value] || '常態';
  }
}

// ====================================================
// 核心物種大類：SlimeCreature (奇異博士披肩流動 + 螢光器官)
// ====================================================
class SlimeCreature {
  constructor(x, y, tier) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.targetPos = createVector(x, y);
    this.initialDist = 0; // 起始距離紀錄（供非線性爆發減速使用）

    this.tier = tier || 1;
    this.exp = 0;
    this.expToNext = this.getExpRequired();

    this.pulsePhase = random(100);
    this.sparks = [];
    this.foraging = false; // 是否正在自主探索尋食
    this.commandCooldown = 0; // 玩家指令後暫停自主覓食
    this.idleTimer = 0; // 到達目標後暫停自主覓食
    this.isChasing = false; // 是否正在追捕獵物
    this.feedingTarget = null; // 正在超渡/吸引的獵物
    this.absorbFlash = 0; // 吸入完成時的黑洞動畫
    // 體表爬行的細微電絲 (Crawling Body Electrical Filaments)
    this.bodyFilaments = [];

    this.isCaptured = false;
    this.captureProgress = 0;

    this.initTierProperties();
  }

  getExpRequired() {
    // 10 階：第 n 階升級需吞噬 n 隻獵物；最終階不再升級
    if (this.tier >= 10) return 9999;
    return this.tier;
  }

  initTierProperties() {
    const tierConfig = {
      1: { radius: 26, tentacleCount: 3, gearCount: 2, speed: 1.65 },
      2: { radius: 44, tentacleCount: 4, gearCount: 2, speed: 1.45 },
      3: { radius: 66, tentacleCount: 5, gearCount: 3, speed: 1.25 },
      4: { radius: 92, tentacleCount: 6, gearCount: 3, speed: 1.05 },
      5: { radius: 122, tentacleCount: 7, gearCount: 4, speed: 0.9 },
      6: { radius: 154, tentacleCount: 8, gearCount: 4, speed: 0.8 },
      7: { radius: 188, tentacleCount: 9, gearCount: 5, speed: 0.72 },
      8: { radius: 224, tentacleCount: 10, gearCount: 5, speed: 0.65 },
      9: { radius: 262, tentacleCount: 11, gearCount: 6, speed: 0.58 },
      10: { radius: 302, tentacleCount: 12, gearCount: 7, speed: 0.52 }
    };

    let cfg = tierConfig[this.tier] || {
      radius: 302 + (this.tier - 10) * 20,
      tentacleCount: 12 + (this.tier - 10),
      gearCount: 7,
      speed: 0.5
    };

    this.baseRadius = cfg.radius;
    this.tentacleCount = cfg.tentacleCount;
    this.maxSpeed = cfg.speed;

    let r = this.baseRadius;

    // 1. 強烈錯位外露齒輪（以 gearCount 動態生成，體型越大齒輪越多）
    this.gears = [];
    const gearDefs = [
      { dx: -0.25, dy: 0.15, r: 0.44, teeth: 6, speed: 0.055, color: '#9a8559', exposed: false },
      { dx: 1.15, dy: -0.55, r: 0.36, teeth: 5, speed: -0.095, color: '#6b727b', exposed: true },
      { dx: 0.22, dy: 1.1, r: 0.3, teeth: 4, speed: 0.13, color: '#855742', exposed: true },
      { dx: -0.95, dy: -0.5, r: 0.28, teeth: 5, speed: -0.17, color: '#5a7366', exposed: true },
      { dx: -0.65, dy: 0.6, r: 0.25, teeth: 5, speed: 0.19, color: '#786882', exposed: true },
      { dx: 0.6, dy: 0.75, r: 0.23, teeth: 4, speed: -0.12, color: '#9a8559', exposed: true },
      { dx: -1.05, dy: 0.35, r: 0.2, teeth: 4, speed: 0.16, color: '#6b727b', exposed: true }
    ];
    for (let gi = 0; gi < cfg.gearCount; gi++) {
      let gd = gearDefs[min(gi, gearDefs.length - 1)];
      this.gears.push(new Gear(
        r * gd.dx, r * gd.dy, r * gd.r,
        max(4, int(r * 0.1)),
        gd.speed, gd.color, gd.exposed
      ));
    }

    // 2. 外露感應電線
    this.wires = [];
    let wireCount = min(12, this.tier + 2);
    for (let i = 0; i < wireCount; i++) {
      let angle = (TWO_PI / wireCount) * i + random(-0.25, 0.25);
      let wireLen = r * random(0.9, 1.4);
      let wireColor = random(['#e04a3f', '#4285f4', '#fbbc05', '#1e1f22']);
      this.wires.push(new BioWire(angle, wireLen, wireColor));
    }

    // 3. 八爪博士錐爪
    this.tentacles = [];
    for (let i = 0; i < this.tentacleCount; i++) {
      let mountAngle = (TWO_PI / this.tentacleCount) * i;
      this.tentacles.push(new DocOckTentacle(this, i, mountAngle));
    }

    // 4. 外溢黏液泡
    this.droplets = [];
    let dropCount = int(r * 0.1);
    for (let i = 0; i < dropCount; i++) {
      this.droplets.push({
        angle: random(TWO_PI),
        distFactor: random(0.85, 1.3),
        radius: random(r * 0.1, r * 0.22),
        phase: random(100),
        orbitSpeed: random(-0.015, 0.015)
      });
    }

    // 5. 體內螢光生物電腺體 (Bioluminescent Neon Glands)
    this.neonGlands = [
      { offsetAngle: 0.5, distR: r * 0.45, size: r * 0.22, color: color(0, 255, 200) },    // 螢光青綠
      { offsetAngle: 2.6, distR: r * 0.38, size: r * 0.18, color: color(255, 120, 10) },   // 螢光橘
      { offsetAngle: -1.8, distR: r * 0.5, size: r * 0.25, color: color(0, 230, 255) }     // 螢光冰藍
    ];
  }

  getClosestTentacle(targetPos) {
    let closest = null;
    let minDist = 9999;
    for (let t of this.tentacles) {
      let d = p5.Vector.dist(t.footPos, targetPos);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }
    return closest;
  }

  setTarget(tx, ty) {
    this.targetPos.set(tx, ty);
    this.commandCooldown = 180; // 指令後短暫專注移動，避免亂跑
  }

  feed(prey) {
    this.exp++;
    this.emitSparks(prey.pos.x - this.pos.x, prey.pos.y - this.pos.y, 20);

    if (this.exp >= this.expToNext && this.tier < 10) {
      this.levelUp();
    }
  }

  levelUp() {
    this.tier++;
    this.exp = 0;
    this.expToNext = this.getExpRequired();
    this.emitSparks(0, 0, 45);
    this.initTierProperties();
  }

  update(isAlpha) {
    let viscosity = ui.viscosity ? Number(ui.viscosity.value) : 1.4;
    let weather = ui.weather ? ui.weather.value : 'normal';
    let weatherSpeed = (weather === 'freezing') ? 0.45 : (weather === 'amber-rain' ? 1.3 : 1.0);
    this.pulsePhase += 0.04 * viscosity * weatherSpeed;

    if (this.isCaptured) return;

    let hasPlayerTarget = isAlpha ? (playerTarget !== null) : false;
    if (hasPlayerTarget) this.foraging = false; // 玩家指令時乖乖過去，不再自主覓食/閒晃
    if (this.commandCooldown > 0) this.commandCooldown--;
    if (this.idleTimer > 0) this.idleTimer--;
    if (this.absorbFlash > 0) this.absorbFlash--;

    // 自主覓食探索：母體在沒有玩家指令時，也會自行探索；一般個體持續探索不原地發呆
    if (isAlpha && !hasPlayerTarget) {
      // 單一決策：優先鎖定最近食物，否則偶爾探索（避免多個迴圈）
      let nearestPrey = null;
      let nearestDist = 520;
      for (let other of creatures) {
        if (other === this || other.isCaptured || other.tier >= this.tier) continue;
        let d = p5.Vector.dist(this.pos, other.pos);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPrey = other;
        }
      }

      if (nearestPrey) {
        this.targetPos.set(nearestPrey.pos.x, nearestPrey.pos.y);
        this.foraging = true;
        this.isChasing = true;
      } else {
        this.isChasing = false;
        let distToCurrentTarget = p5.Vector.dist(this.targetPos, this.pos);
        if (this.foraging && distToCurrentTarget < 18) {
          this.foraging = false;
        }
        if (!this.foraging && this.commandCooldown <= 0 && this.idleTimer <= 0 && random(1) < 0.006) {
          let wanderDist = random(90, 260);
          let wanderAngle = random(TWO_PI);
          this.targetPos.set(this.pos.x + cos(wanderAngle) * wanderDist, this.pos.y + sin(wanderAngle) * wanderDist);
          this.foraging = true;
        }
      }
    }

    let hasTarget = hasPlayerTarget || this.foraging || (!isAlpha);

    // 族群分離：避免所有個體擠成一團，維持覓食探索的分散感
    let separation = createVector(0, 0);
    for (let other of creatures) {
      if (other === this || other.isCaptured) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      let minSep = this.baseRadius + other.baseRadius + 24;
      if (d > 0 && d < minSep) {
        let away = p5.Vector.sub(this.pos, other.pos);
        away.normalize();
        away.mult((minSep - d) / minSep);
        separation.add(away);
      }
    }
    separation.mult(0.4);

    if (hasTarget) {
      let toTarget = p5.Vector.sub(this.targetPos, this.pos);
      let distToTarget = toTarget.mag();

      if (distToTarget > 14) {
        // 黏液拖動感；追捕時提升速度與加速度，讓追逐更直接
        let speedFactor = this.isChasing ? 0.95 : 0.55;
        let lerpFactor = this.isChasing ? 0.12 : 0.045;
        toTarget.setMag(this.maxSpeed * weatherSpeed * speedFactor);
        this.vel.lerp(toTarget, lerpFactor);
        this.pos.add(this.vel);
      } else {
        this.vel.mult(0.82);
        this.pos.add(this.vel);
        if (isAlpha && hasPlayerTarget) playerTarget = null;
        if (isAlpha) { this.foraging = false; this.idleTimer = 240; }
      }
    } else {
      this.vel.mult(0.82);
      this.pos.add(this.vel);
    }

    this.vel.add(separation);
    this.vel.limit(this.maxSpeed * weatherSpeed * 0.7);

    // 非 alpha 個體：持續探索，不只癡等
    if (!isAlpha && random(1) < 0.025) {
      let wanderDist = random(100, 260);
      let wanderAngle = random(TWO_PI);
      this.targetPos.set(this.pos.x + cos(wanderAngle) * wanderDist, this.pos.y + sin(wanderAngle) * wanderDist);
    }

    // 超渡/吸引式進食：以光罩吸引獵物並消滅
    if (this.feedingTarget) {
      if (creatures.indexOf(this.feedingTarget) === -1) {
        this.feedingTarget = null;
      } else {
        let prey = this.feedingTarget;
        let toPred = p5.Vector.sub(this.pos, prey.pos);
        let d = toPred.mag();
        if (d > this.baseRadius * 0.6 && prey.baseRadius > 2) {
          let attractSpeed = min(d * 0.38, this.maxSpeed * 1.6 * weatherSpeed);
          prey.pos.add(toPred.copy().normalize().mult(attractSpeed));
          // 最後黑洞式吸入：接近時強烈加速縮小
          let shrink = (d < this.baseRadius * 2.8) ? 0.88 : 0.97;
          prey.baseRadius *= shrink;
        } else {
          let residuePos = prey.pos.copy();
          for (let i = 0; i < 9; i++) {
            preyResidues.push({
              x: residuePos.x + random(-18, 18),
              y: residuePos.y + random(-18, 18),
              size: random(6, 14),
              life: 420,
              maxLife: 420
            });
          }
          this.feed(prey);
          let preyIdx = creatures.indexOf(prey);
          if (preyIdx !== -1) creatures.splice(preyIdx, 1);
          this.absorbFlash = 36;
          this.feedingTarget = null;
          this.foraging = false;
          this.idleTimer = 0;
        }
      }
    }

    this.constrainBounds();

    // 待機摸索：速度慢或沒有明確推進時，爪尖在四周輕巧摸索（找回待機動作）
    let isIdleSeeking = this.vel.mag() < 0.4 && !(isAlpha && hasPlayerTarget);

    // 更新爪子（含破格前爪長跨距抓地牽引）
    for (let t of this.tentacles) {
      t.update(this.pos, this.vel, this.baseRadius, viscosity, isIdleSeeking);
    }

    // 更新齒輪
    let gearMultiplier = ui.gearSpeed ? Number(ui.gearSpeed.value) : 1.0;
    gearMultiplier *= weatherSpeed;
    if (this.vel.mag() > 0.25) gearMultiplier *= 1.8;
    for (let gear of this.gears) {
      gear.update(gearMultiplier);
    }

    // 更新電線
    for (let wire of this.wires) {
      wire.update(this.pos, this.vel, this.baseRadius);
    }

    // 更新外溢黏液泡
    for (let d of this.droplets) {
      d.angle += d.orbitSpeed;
    }

    // 體表爬行的細微電絲 (Crawling Body Electrical Filaments)
    if (random(1) < 0.18 && this.bodyFilaments.length < 3) {
      let fAngle = random(TWO_PI);
      let fRadius = this.baseRadius * random(0.3, 0.9);
      this.bodyFilaments.push({
        x: cos(fAngle) * fRadius,
        y: sin(fAngle) * fRadius,
        points: [createVector(cos(fAngle) * fRadius, sin(fAngle) * fRadius)],
        life: 12,
        isCyan: random() > 0.5
      });
    }

    for (let i = this.bodyFilaments.length - 1; i >= 0; i--) {
      let f = this.bodyFilaments[i];
      f.life--;
      if (f.points.length < 4) {
        let last = f.points[f.points.length - 1];
        f.points.push(p5.Vector.add(last, p5.Vector.random2D().mult(random(8, 18))));
      }
      if (f.life <= 0) this.bodyFilaments.splice(i, 1);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      this.sparks[i].update();
      if (this.sparks[i].isDead()) this.sparks.splice(i, 1);
    }
  }

  emitSparks(localX, localY, count) {
    for (let i = 0; i < count; i++) {
      this.sparks.push(new ElectricSpark(this.pos.x + localX, this.pos.y + localY));
    }
  }

  constrainBounds() {
    let pad = this.baseRadius + 30;
    if (this.pos.x < pad) { this.pos.x = pad; this.vel.x *= -0.5; }
    if (this.pos.x > width - pad) { this.pos.x = width - pad; this.vel.x *= -0.5; }
    if (this.pos.y < pad) { this.pos.y = pad; this.vel.y *= -0.5; }
    if (this.pos.y > height - pad) { this.pos.y = height - pad; this.vel.y *= -0.5; }
  }

  display(isAlpha) {
    let r = this.baseRadius;
    let viscosity = ui.viscosity ? Number(ui.viscosity.value) : 1.4;

    // 1. 繪製爪子
    for (let t of this.tentacles) {
      t.display();
    }

    push();
    translate(this.pos.x, this.pos.y);

    // 2. 母體控制光環
    if (isAlpha) {
      noFill();
      stroke(255, 140, 30, 90 + 40 * sin(this.pulsePhase));
      strokeWeight(1.6);
      circle(0, 0, r * 2.8);
    }

    // 3. 外部生物電磁光暈
    this.drawSlimeAura(r);

    // 超渡/吸引進食光罩
    if (this.feedingTarget) {
      push();
      blendMode(ADD);
      noStroke();
      let pulse = sin(this.pulsePhase * 2) * 0.12 + 1.0;
      for (let k = 6; k >= 1; k--) {
        fill(120, 230, 255, 14 / k + 6 * sin(this.pulsePhase * 3));
        circle(0, 0, (r * (1.75 + k * 0.6)) * pulse);
      }
      fill(220, 250, 255, 34 + 16 * sin(this.pulsePhase * 4));
      circle(0, 0, r * 1.2 * pulse);
      blendMode(BLEND);
      pop();
    }

    // 4. 外溢黏液泡泡
    this.drawSlimeDroplets(r);

    // 5. 核心水感不規則膠體（奇異博士披肩流動波形）
    this.drawDeepSlimeBody(r, viscosity);

    // 6. 體內發光的螢光腺體器官 (Bioluminescent Neon Glands)
    this.drawNeonGlands();

    // 7. 強烈錯位齒輪組
    for (let gear of this.gears) {
      gear.display();
    }

    // 8. 外露齒輪牽絲蹼
    this.drawGearSlimeWebbing(r);

    // 9. 半透明黑色凝膠覆蓋層
    this.drawSlimeOverlay(r, viscosity);

    // 10. 體表爬行的細微電絲 (Crawling Body Electrical Filaments)
    this.drawBodyFilaments();

    // 11. 外露電線
    pop();
    for (let wire of this.wires) {
      wire.display();
    }
    push();
    translate(this.pos.x, this.pos.y);

    // 黑洞吸入動畫
    if (this.absorbFlash > 0) {
      push();
      let p = this.absorbFlash / 36;
      blendMode(ADD);
      noFill();
      stroke(10, 14, 24, 220 * p);
      strokeWeight(3 + 8 * (1 - p));
      circle(0, 0, r * (0.6 + (1 - p) * 3.5));
      fill(5, 8, 16, 240 * p);
      noStroke();
      circle(0, 0, r * (0.3 + (1 - p) * 1.2));
      blendMode(BLEND);
      pop();
    }

    // 12. 水感表面張力高光與立體油斑
    this.drawSpecularHighlights(r);

    // 13. 體表電弧
    pop();
    for (let spark of this.sparks) {
      spark.display();
    }
  }

  drawSlimeAura(r) {
    noStroke();
    let weather = ui.weather ? ui.weather.value : 'normal';
    if (weather === 'amber-rain') {
      fill(255, 120, 20, 42 + 15 * sin(this.pulsePhase));
    } else {
      fill(255, 110, 25, 22 + 8 * sin(this.pulsePhase));
    }
    ellipse(0, 0, r * 2.5, r * 2.3);
    fill(12, 18, 16, 170);
    ellipse(0, 0, r * 2.2, r * 2.0);
  }

  drawSlimeDroplets(r) {
    fill(10, 13, 16, 245);
    stroke(45, 55, 65, 190);
    strokeWeight(1.5);

    for (let d of this.droplets) {
      let orbitR = r * d.distFactor + sin(this.pulsePhase + d.phase) * 6;
      let dx = cos(d.angle) * orbitR;
      let dy = sin(d.angle) * orbitR;
      circle(dx, dy, d.radius);

      noStroke();
      fill(200, 220, 240, 80);
      circle(dx - d.radius * 0.25, dy - d.radius * 0.25, d.radius * 0.35);
      stroke(45, 55, 65, 190);
      strokeWeight(1.5);
    }
  }

  // ----------------------------------------------------
  // 奇異博士披肩流動 ＋ 水感不規則史萊姆形變
  // ----------------------------------------------------
  drawDeepSlimeBody(r, viscosity) {
    push();
    // 濃稠水墨黑帶微透深綠
    fill(8, 10, 14);
    stroke(48, 62, 75);
    strokeWeight(3.2);

    let breath = sin(this.pulsePhase) * (5 * viscosity);
    let points = 24;

    let spd = this.vel.mag();
    let heading = this.vel.heading();

    beginShape();
    for (let i = 0; i < points; i++) {
      let a = map(i, 0, points, 0, TWO_PI);
      let diff = a - heading;
      let cosDiff = cos(diff);

      // 1. 披肩翻飛波浪 (Cloak Undulating Wave)：在後方像斗篷下擺一樣起伏擺動！
      let cloakWave = 0;
      if (spd > 0.15) {
        // 後方產生左右擺動與翻捲的披肩波動
        cloakWave = sin(a * 4 - frameCount * 0.18 + spd * 2.5) * (spd * 12.0) * max(0, -cosDiff);
      }

      // 2. 前端向前破浪，後端收斂成披肩尾翼
      let stretchOffset = 0;
      if (spd > 0.15) {
        if (cosDiff > 0) {
          stretchOffset = cosDiff * (spd * 15.0);
        } else {
          stretchOffset = cosDiff * (spd * 16.0);
        }
      }

      // 3. 水感不規則表面形變 (Water-like Fluid Lobes)
      let nx = map(cos(a), -1, 1, 0, 2.5 * viscosity);
      let ny = map(sin(a), -1, 1, 0, 2.5 * viscosity);
      let n1 = noise(nx, ny, frameCount * 0.015);
      let n2 = noise(nx * 3.0, ny * 3.0, frameCount * 0.04) * 0.35;
      let pr = r + breath + stretchOffset + cloakWave + map(n1 + n2, 0, 1.35, -18 * viscosity, 20 * viscosity);

      curveVertex(pr * cos(a), pr * sin(a));
    }
    endShape(CLOSE);
    pop();
  }

  // ----------------------------------------------------
  // 體內發光的螢光腺體器官 (Bioluminescent Neon Glands)
  // ----------------------------------------------------
  drawNeonGlands() {
    push();
    blendMode(ADD);
    for (let g of this.neonGlands) {
      let gx = cos(g.offsetAngle + this.pulsePhase * 0.2) * g.distR;
      let gy = sin(g.offsetAngle + this.pulsePhase * 0.2) * g.distR;
      let gSize = g.size + sin(this.pulsePhase * 1.5 + g.offsetAngle) * 4;
      let glowAlpha = 70 + 40 * sin(this.pulsePhase * 2 + g.offsetAngle);

      // 多層螢光光暈（ADD 混色做出發光）
      noStroke();
      for (let k = 2; k >= 1; k--) {
        fill(red(g.color), green(g.color), blue(g.color), glowAlpha / k);
        circle(gx, gy, gSize * (1.4 + k * 0.7));
      }

      // 螢光腺體核心
      blendMode(BLEND);
      fill(red(g.color), green(g.color), blue(g.color), 220);
      circle(gx, gy, gSize);
      fill(255, 255, 255, 230);
      circle(gx, gy, gSize * 0.38);
      blendMode(ADD);
    }
    blendMode(BLEND);
    pop();
  }

  drawGearSlimeWebbing(r) {
    push();
    fill(12, 14, 18, 230);
    stroke(45, 55, 65, 180);
    strokeWeight(1.5);

    for (let gear of this.gears) {
      if (gear.isExposed) {
        let gx = gear.localPos.x;
        let gy = gear.localPos.y;
        let rootAngle = atan2(gy, gx);

        let p1 = createVector(cos(rootAngle - 0.45) * r * 0.82, sin(rootAngle - 0.45) * r * 0.82);
        let p2 = createVector(cos(rootAngle + 0.45) * r * 0.82, sin(rootAngle + 0.45) * r * 0.82);

        beginShape();
        vertex(p1.x, p1.y);
        bezierVertex(p1.x * 0.5 + gx * 0.5, p1.y * 0.5 + gy * 0.5, gx - 10, gy - 10, gx, gy);
        bezierVertex(gx + 10, gy + 10, p2.x * 0.5 + gx * 0.5, p2.y * 0.5 + gy * 0.5, p2.x, p2.y);
        endShape(CLOSE);
      }
    }
    pop();
  }

  drawSlimeOverlay(r, viscosity) {
    push();
    fill(12, 15, 19, 155);
    noStroke();

    let breath = sin(this.pulsePhase + 0.25) * (3.8 * viscosity);
    let points = 20;

    beginShape();
    for (let i = 0; i < points; i++) {
      let a = map(i, 0, points, 0, TWO_PI);
      let nx = map(cos(a), -1, 1, 0.5, 2.0);
      let ny = map(sin(a), -1, 1, 0.5, 2.0);
      let n = noise(nx, ny, frameCount * 0.012 + 10);
      let pr = (r * 0.94) + breath + map(n, 0, 1, -11, 13);
      curveVertex(pr * cos(a), pr * sin(a));
    }
    endShape(CLOSE);
    pop();
  }

  // ----------------------------------------------------
  // 體表爬行的細微電絲 (Crawling Body Electrical Filaments)
  // ----------------------------------------------------
  drawBodyFilaments() {
    push();
    noFill();
    for (let f of this.bodyFilaments) {
      if (f.isCyan) {
        stroke(0, 255, 230, f.life * 20); // 螢光青藍電絲
      } else {
        stroke(255, 140, 20, f.life * 20); // 螢光橘電絲
      }
      strokeWeight(1.4);
      beginShape();
      for (let pt of f.points) {
        vertex(pt.x, pt.y);
      }
      endShape();
    }
    pop();
  }

  drawSpecularHighlights(r) {
    push();
    noStroke();
    let breath = sin(this.pulsePhase) * 3;

    // 水銀水感反光：清澈明亮的高光弧
    fill(180, 215, 255, 110);
    ellipse(-r * 0.38, -r * 0.38, (r * 0.38) + breath, (r * 0.22) + breath * 0.5);

    fill(255, 255, 255, 140);
    ellipse(-r * 0.42, -r * 0.42, r * 0.14, r * 0.09);

    fill(140, 185, 220, 75);
    ellipse(r * 0.25, r * 0.22, r * 0.25, r * 0.14);

    fill(200, 235, 255, 45);
    arc(0, 0, r * 1.65, r * 1.55, PI * 0.78, PI * 1.35);
    pop();
  }
}

// ====================================================
// 八爪博士程序性錐爪：DocOckTentacle (前爪破格長跨距強拉)
// ====================================================
class DocOckTentacle {
  constructor(creature, index, mountAngle) {
    this.creature = creature;
    this.index = index;
    this.mountAngle = mountAngle;

    this.footPos = createVector(0, 0);
    this.stepStartPos = createVector(0, 0);
    this.stepTargetPos = createVector(0, 0);

    this.isRetracting = false;
    this.retractProgress = 0;
    this.retractStart = createVector(0, 0);
    this.retractTarget = createVector(0, 0);

    // 落腳後先固定錨定，讓身體被拉動，再收回
    this.isAnchoring = false;
    this.anchorTimer = 0;
    this.plantedPos = createVector(0, 0);

    this.isStepping = false;
    this.stepProgress = 0;
    this.stepDuration = 18;

    this.isGrabbing = false;
    this.grabTarget = null;
    this.grabProgress = 0;
    this.isMainGrab = false;

    this.isWrapping = false;
    this.wrapTarget = null;

    let initReach = this.creature.baseRadius * 1.6;
    let initDir = p5.Vector.fromAngle(this.mountAngle);
    this.footPos = p5.Vector.add(this.creature.pos, p5.Vector.mult(initDir, initReach));
  }

  grabPrey(prey, isMain = true) {
    this.isGrabbing = true;
    this.isMainGrab = isMain;
    this.grabTarget = prey;
    prey.isCaptured = true;
    this.grabProgress = 0;
  }

  wrapPrey(prey) {
    this.isWrapping = true;
    this.wrapTarget = prey;
  }

  releaseGrab() {
    this.isGrabbing = false;
    this.isMainGrab = false;
    this.grabTarget = null;
    this.grabProgress = 0;
    this.isWrapping = false;
    this.wrapTarget = null;
  }

  update(creaturePos, creatureVel, baseRadius, viscosity, isIdleSeeking) {
    // 0c. 包覆爪：圍住獵物、協助拖拽
    if (this.isWrapping) {
      if (!this.wrapTarget || creatures.indexOf(this.wrapTarget) === -1) {
        this.isWrapping = false;
        this.wrapTarget = null;
      } else {
        let wrapAngle = this.mountAngle + sin(frameCount * 0.12 + this.index) * 0.9;
        let desired = p5.Vector.add(this.wrapTarget.pos, p5.Vector.mult(p5.Vector.fromAngle(wrapAngle), baseRadius * 0.35));
        this.footPos = p5.Vector.lerp(this.footPos, desired, 0.28);
        return;
      }
    }

    // 1. 抓取進食
    if (this.isGrabbing && this.grabTarget) {
      if (!this.isMainGrab) {
        // 多餘的非主爪確保不拖拽
      }

      if (this.isMainGrab) {
        this.grabProgress += 0.04;
        let dragStart = this.grabTarget.pos.copy();
        let dragEnd = creaturePos.copy();
        let currentDragPos = p5.Vector.lerp(dragStart, dragEnd, this.grabProgress);

        this.footPos.set(currentDragPos.x, currentDragPos.y);
        this.grabTarget.pos.set(currentDragPos.x, currentDragPos.y);
        // 進食時獵物逐漸被吸收
        if (this.grabTarget.baseRadius > 4) this.grabTarget.baseRadius *= 0.985;

        if (random(1) < 0.55) {
          this.creature.emitSparks(this.footPos.x - creaturePos.x, this.footPos.y - creaturePos.y, 3);
        }
      } else {
        // 非主爪僅跟隨包覆
        this.footPos = p5.Vector.lerp(this.footPos, this.grabTarget.pos.copy(), 0.25);
      }

      if (this.isMainGrab && this.grabProgress >= 1.0) {
        let residuePos = this.grabTarget.pos.copy();
        this.creature.feed(this.grabTarget);
        for (let i = 0; i < 16; i++) {
          preyResidues.push({
            x: residuePos.x + random(-16, 16),
            y: residuePos.y + random(-16, 16),
            size: random(5, 12),
            life: 420,
            maxLife: 420
          });
        }
        let preyIdx = creatures.indexOf(this.grabTarget);
        if (preyIdx !== -1) creatures.splice(preyIdx, 1);

        // 釋放所有包覆爪
        for (let t of this.creature.tentacles) {
          if (t.wrapTarget === this.grabTarget) {
            t.isWrapping = false;
            t.wrapTarget = null;
          }
        }

        this.isGrabbing = false;
        this.isMainGrab = false;
        this.grabTarget = null;
        this.grabProgress = 0;

        let initReach = baseRadius * 1.6;
        let initDir = p5.Vector.fromAngle(this.mountAngle);
        this.footPos = p5.Vector.add(creaturePos, p5.Vector.mult(initDir, initReach));

        // 繼續獵捕：若有其他獵物則下幀追擊
        this.creature.foraging = false;
        this.creature.idleTimer = 0;
      }
      return;
    }

    // 0a. 落腳後先錨定：爪子固定在落點，拉動身體；直到爪子 gần 身體才放開重新抓
    if (this.isAnchoring) {
      this.footPos.set(this.plantedPos.x, this.plantedPos.y);
      let toFoot = p5.Vector.sub(this.footPos, this.creature.pos);
      let distFoot = toFoot.mag();

      // 爪子參與推进：落點在前則拉、在後則推，避免後爪無所事事
      let moveDir = this.creature.vel.copy();
      if (moveDir.mag() < 0.01) moveDir = p5.Vector.sub(this.creature.targetPos, this.creature.pos);
      if (moveDir.mag() > 0) moveDir.normalize();
      let footAhead = p5.Vector.dot(toFoot, moveDir) > 0;
      let propulsion = toFoot.copy();
      if (!footAhead) propulsion.mult(-1);

      if (distFoot > this.creature.baseRadius * 0.45) {
        let pullMag = min(distFoot * 0.10, this.creature.maxSpeed * 0.8);
        propulsion.setMag(pullMag);
        this.creature.vel.lerp(propulsion, 0.28);
        this.creature.pos.add(this.creature.vel);
      }

      // 最少錨定幾幀，再依距離釋放（爪子快碰到身體時放開；避免完全消失）
      if (this.anchorTimer <= 0 || (this.anchorTimer <= 6 && distFoot < baseRadius * 1.15)) {
        this.isAnchoring = false;
        this.retractStart = this.footPos.copy();
        let retractReach = baseRadius * 0.85;
        let retractDir = p5.Vector.fromAngle(this.mountAngle);
        this.retractTarget = p5.Vector.add(creaturePos, p5.Vector.mult(retractDir, retractReach));
        this.isRetracting = true;
        this.retractProgress = 0;
        return;
      }
      this.anchorTimer--;
      return;
    }

    // 0b. 釋放後平滑收回，避免直接消失（呈現拉動收回的感覺）
    if (this.isRetracting) {
      this.retractProgress += 1 / 18;
      let eased = this.retractProgress * this.retractProgress * (3 - 2 * this.retractProgress);
      this.footPos = p5.Vector.lerp(this.retractStart, this.retractTarget, eased);
      if (this.retractProgress >= 1) {
        this.isRetracting = false;
        this.footPos.set(this.retractTarget.x, this.retractTarget.y);
      }
      return;
    }

    // 2. 原地待機摸索
    if (isIdleSeeking) {
      this.isStepping = false;
      let seekAngle = this.mountAngle + (noise(this.index * 10, frameCount * 0.015) - 0.5) * 0.6;
      let seekReach = baseRadius * (1.5 + (noise(this.index * 20, frameCount * 0.02) - 0.5) * 0.4);

      let tapCycle = sin(frameCount * 0.06 + this.index * 1.2);
      let tapHeight = max(0, tapCycle) * (baseRadius * 0.25);

      let targetFootX = creaturePos.x + cos(seekAngle) * seekReach;
      let targetFootY = creaturePos.y + sin(seekAngle) * seekReach - tapHeight;

      this.footPos.x = lerp(this.footPos.x, targetFootX, 0.08);
      this.footPos.y = lerp(this.footPos.y, targetFootY, 0.08);
      return;
    }

    // 3. 移動時：前爪破格長跨距錨定強拉！(Forceful Anchored Pull)
    let idealDir = p5.Vector.fromAngle(this.mountAngle);
    let reach = baseRadius * 1.7;

    let spd = creatureVel.mag();
    let isLeadClaw = false;

    if (spd > 0.1) {
      let forwardDir = creatureVel.copy().normalize();
      let forwardDot = p5.Vector.dot(idealDir, forwardDir); // 朝前 +1, 朝後 -1
      if (forwardDot > 0.25) {
        // 前方爪子先拉到極限，再放開（擴大跨距上限）
        let reachBonus = map(forwardDot, 0.25, 1.0, 1.25, 2.15);
        reach *= reachBonus;
        isLeadClaw = true;
      } else {
        // 後方爪子貼近拖曳支撐
        reach *= 0.85;
      }
    }

    // 允許多個爪子同時帶動本體：不設定單一忙碌鎖，所有條件足夠的爪子都可参与
    let moveForward = creatureVel.copy().mult(isLeadClaw ? 22 : 10);
    let idealFoot = p5.Vector.add(creaturePos, p5.Vector.mult(idealDir, reach)).add(moveForward);

    let distToIdeal = p5.Vector.dist(this.footPos, idealFoot);
    // 拉到更極限才放開：需要更大的偏移才觸發下一步
    let stepThreshold = baseRadius * (isLeadClaw ? 0.85 : 1.0);

    // 多爪同步：所有速度足夠的爪子都可以參與推进，不只一隻
    let canAnchor = spd > 0.1;
    let activeCount = this.creature.tentacles.filter(t => t.isStepping || t.isAnchoring || t.isRetracting).length;
    let canStep = canAnchor && activeCount < 2 && distToIdeal > stepThreshold;

    if (!this.isStepping && distToIdeal > stepThreshold && canStep) {
      this.isStepping = true;
      this.stepProgress = 0;
      this.stepStartPos = this.footPos.copy();
      this.stepTargetPos = p5.Vector.add(idealFoot, p5.Vector.mult(creatureVel, isLeadClaw ? 12 : 6));
    }

    if (this.isStepping) {
      this.stepProgress += 1 / this.stepDuration;
      let groundPos = p5.Vector.lerp(this.stepStartPos, this.stepTargetPos, this.stepProgress);
      let archHeight = baseRadius * (isLeadClaw ? 1.15 : 0.8) * sin(this.stepProgress * PI);
      let liftVec = p5.Vector.fromAngle(this.mountAngle).mult(archHeight * 0.35);

      this.footPos.set(groundPos.x + liftVec.x, groundPos.y + liftVec.y - archHeight * 0.7);

      if (this.stepProgress >= 1.0) {
        this.isStepping = false;
        // 落腳後先固定錨定，身體被拉動，再平滑收回，避免直接消失
        this.isAnchoring = true;
        this.anchorTimer = 45;
        this.plantedPos = this.stepTargetPos.copy();
        this.footPos = this.stepTargetPos.copy();
        this.creature.emitSparks(this.stepTargetPos.x - creaturePos.x, this.stepTargetPos.y - creaturePos.y, isLeadClaw ? 6 : 3);
      }
    }
  }

  display() {
    let r = this.creature.baseRadius;
    let root = p5.Vector.add(this.creature.pos, p5.Vector.mult(p5.Vector.fromAngle(this.mountAngle), r * 0.65));
    let tip = this.footPos.copy();

    let mid = p5.Vector.add(root, tip).mult(0.5);
    let outDir = p5.Vector.fromAngle(this.mountAngle);
    let kneeDist = r * 0.75;
    let knee = p5.Vector.add(mid, p5.Vector.mult(outDir, kneeDist));

    let nodeCount = 10;
    let nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      let t = i / (nodeCount - 1);
      let p1 = p5.Vector.lerp(root, knee, t);
      let p2 = p5.Vector.lerp(knee, tip, t);
      nodes.push(p5.Vector.lerp(p1, p2, t));
    }

    let rootThickness = r * 0.62;
    let tipThickness = 4.0;

    let leftContour = [];
    let rightContour = [];

    for (let i = 0; i < nodeCount; i++) {
      let t = i / (nodeCount - 1);
      let thickness = lerp(rootThickness, tipThickness, pow(t, 0.65));

      let prev = nodes[max(0, i - 1)];
      let next = nodes[min(nodeCount - 1, i + 1)];
      let tangent = p5.Vector.sub(next, prev);
      if (tangent.mag() === 0) tangent = outDir;
      tangent.normalize();
      let normal = createVector(-tangent.y, tangent.x);

      leftContour.push(p5.Vector.add(nodes[i], p5.Vector.mult(normal, thickness * 0.5)));
      rightContour.push(p5.Vector.sub(nodes[i], p5.Vector.mult(normal, thickness * 0.5)));
    }

    push();
    fill(12, 13, 17, 245);
    stroke(45, 54, 64, 220);
    strokeWeight(1.8);

    beginShape();
    curveVertex(leftContour[0].x, leftContour[0].y);
    for (let pt of leftContour) curveVertex(pt.x, pt.y);
    curveVertex(tip.x, tip.y);
    for (let i = rightContour.length - 1; i >= 0; i--) curveVertex(rightContour[i].x, rightContour[i].y);
    curveVertex(rightContour[0].x, rightContour[0].y);
    endShape(CLOSE);

    // 金屬外骨骼肋條
    stroke(80, 95, 110, 160);
    strokeWeight(1.4);
    for (let i = 2; i < nodeCount - 2; i += 2) {
      line(leftContour[i].x, leftContour[i].y, rightContour[i].x, rightContour[i].y);
    }

    // 中軸螢光動脈微流（螢光橘）
    noFill();
    for (let i = 0; i < nodeCount - 1; i++) {
      let t = i / (nodeCount - 1);
      let streamPulse = sin(frameCount * 0.14 - i * 0.8 + this.index);
      stroke(255, 115, 15, 110 + 110 * streamPulse);
      strokeWeight(map(t, 0, 1, max(2.5, r * 0.08), 1.0));
      line(nodes[i].x, nodes[i].y, nodes[i + 1].x, nodes[i + 1].y);
    }

    // 尖銳釘爪（亮螢光橘點）
    fill(255, 140, 20);
    noStroke();
    circle(tip.x, tip.y, 5.5);

    pop();
  }
}

// ====================================================
// 強烈錯位齒輪類別：Gear (含軸心電弧)
// ====================================================
class Gear {
  constructor(x, y, radius, teeth, rotSpeed, colorHex, isExposed) {
    this.localPos = createVector(x, y);
    this.radius = radius;
    this.teeth = teeth;
    this.toothDepth = radius * 0.22;
    this.angle = random(TWO_PI);
    this.baseSpeed = rotSpeed;
    this.colorHex = colorHex;
    this.isExposed = isExposed || false;
    this.jitter = 0;
    this.sparkTimer = 0;
  }

  update(speedMultiplier) {
    if (random(1) < 0.02) this.jitter = random(-0.04, 0.04);
    this.jitter *= 0.82;
    this.angle += (this.baseSpeed * speedMultiplier) + this.jitter;

    if (random(1) < 0.035) {
      this.sparkTimer = int(random(3, 8));
    }
  }

  display() {
    push();
    translate(this.localPos.x, this.localPos.y);
    rotate(this.angle);

    fill(this.colorHex);
    stroke(20, 22, 26);
    strokeWeight(1.4);

    beginShape();
    let totalPoints = this.teeth * 4;
    for (let i = 0; i < totalPoints; i++) {
      let a = map(i, 0, totalPoints, 0, TWO_PI);
      let r = this.radius;
      let mod = i % 4;
      if (mod === 1 || mod === 2) r += this.toothDepth;
      vertex(r * cos(a), r * sin(a));
    }
    endShape(CLOSE);

    fill(18, 18, 20);
    circle(0, 0, this.radius * 0.52);

    fill(190, 180, 160);
    noStroke();
    circle(0, 0, this.radius * 0.2);

    fill(18, 18, 20);
    for (let i = 0; i < 3; i++) {
      let holeAngle = (TWO_PI / 3) * i;
      circle((this.radius * 0.35) * cos(holeAngle), (this.radius * 0.35) * sin(holeAngle), this.radius * 0.16);
    }

    // 軸心螢光電弧
    if (this.sparkTimer > 0) {
      this.sparkTimer--;
      stroke(random() > 0.4 ? color(0, 255, 230, 240) : color(255, 140, 20, 240));
      strokeWeight(1.6);
      let sparkAngle = random(TWO_PI);
      let sparkLen = this.radius * random(0.25, 0.75);
      line(0, 0, cos(sparkAngle) * sparkLen, sin(sparkAngle) * sparkLen);
    }

    pop();
  }
}

// ====================================================
// 柔性電線類別：BioWire
// ====================================================
class BioWire {
  constructor(angle, length, wireColor) {
    this.angle = angle;
    this.length = length;
    this.wireColor = wireColor;
    this.jointCount = 6;
    this.joints = [];
    for (let i = 0; i < this.jointCount; i++) this.joints.push(createVector(0, 0));
  }

  update(creaturePos, creatureVel, baseRad) {
    let rootX = creaturePos.x + cos(this.angle) * (baseRad * 0.4);
    let rootY = creaturePos.y + sin(this.angle) * (baseRad * 0.4);
    this.joints[0].set(rootX, rootY);

    for (let i = 1; i < this.jointCount; i++) {
      let segLength = this.length / this.jointCount;
      let sway = sin(frameCount * 0.05 + i * 0.4 + this.angle) * (i * 2.8);
      let n = (noise(this.angle, i, frameCount * 0.015) - 0.5) * 14;
      let lagForce = p5.Vector.mult(creatureVel, -i * 3.5);

      let targetX = this.joints[i - 1].x + cos(this.angle) * segLength + sway + n + lagForce.x;
      let targetY = this.joints[i - 1].y + sin(this.angle) * segLength + sway + n + lagForce.y;

      this.joints[i].x = lerp(this.joints[i].x, targetX, 0.28);
      this.joints[i].y = lerp(this.joints[i].y, targetY, 0.28);
    }
  }

  display() {
    noFill();
    stroke(this.wireColor);
    strokeWeight(2.8);

    beginShape();
    curveVertex(this.joints[0].x, this.joints[0].y);
    for (let pt of this.joints) curveVertex(pt.x, pt.y);
    let tip = this.joints[this.joints.length - 1];
    curveVertex(tip.x, tip.y);
    endShape();

    fill(215, 145, 65);
    noStroke();
    circle(tip.x, tip.y, 4);

    if (random(1) < 0.05) {
      stroke(0, 255, 230, 220); // 螢光青藍微光
      strokeWeight(1.3);
      line(tip.x, tip.y, tip.x + random(-6, 6), tip.y + random(-6, 6));
    }
  }
}

// ====================================================
// 電弧粒子類別：ElectricSpark
// ====================================================
class ElectricSpark {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 4.5));
    this.life = 255;
    this.decay = random(16, 30);
    this.sparkColor = random() > 0.5 ? color(0, 255, 230) : color(255, 140, 20);
  }

  update() {
    this.pos.add(this.vel);
    this.life -= this.decay;
  }

  isDead() {
    return this.life <= 0;
  }

  display() {
    stroke(red(this.sparkColor), green(this.sparkColor), blue(this.sparkColor), this.life);
    strokeWeight(random(1.2, 2.6));
    point(this.pos.x, this.pos.y);
  }
}
