import * as THREE from '../vendor/three.module.js';
import { Gear } from './gear.js';
import { createSlimeBody, createSlimePool, createSlimeSkirt, makeRadialTexture } from './slime.js';

const TAU = Math.PI * 2;

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

/** 把角度差包回 -π ~ π，彈簧才不會繞遠路 */
function wrapAngle(a) {
  let d = (a + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}

/**
 * 把單位球面上的一個方向，換算成軀體著色器裡「壓扁、攤開」之後的表面點。
 * 這樣體內的氣泡與體表的電弧才會真的貼在那灘黏液上，不會浮在球外。
 */
function slimeSurfacePoint(th, ph, out, lift = 1) {
  const sp = Math.sin(ph);
  let x = sp * Math.cos(th);
  let y = Math.cos(ph);
  let z = sp * Math.sin(th);

  y = Math.max(y * 0.60, -0.52) * 1.02;

  const bulge = 1 - THREE.MathUtils.smoothstep(y, -0.65, 0.30);
  const spread = 1 + bulge * 0.62;
  x *= spread;
  z = z * spread * 1.05 + bulge * 0.06;

  out.set(x * lift, y * lift, z * lift);
  return out;
}

/**
 * M2 八爪機械共生體（3D 版）。
 *
 * 現在沒有觸手了：整隻就是一坨黏在地上的半透明機械史萊姆。
 *   - 半透明黏液軀體（slime.js 的著色器球體，底部壓平）
 *   - 從軀體垂到地面的膠質裙擺（slime.js）
 *   - 體內咬合齒輪（gear.js）
 *   - 體內螢光腺體、核心、體表不定期放電閃爍
 *   - 地上的黏液灘、爬行痕跡與接觸陰影
 *
 * 行為：自己挑一個目標 → 用蠕動的節奏爬過去 → 停下來呼吸放電 → 再挑下一個目標。
 */
export class SlimeCreature {
  constructor({ scene, bounds, ripples, sparks, trail, glowTexture }) {
    this.scene = scene;
    this.bounds = bounds;
    this.ripples = ripples;
    this.sparks = sparks;
    this.trail = trail;

    this.pos = new THREE.Vector3(0, 0, 0.8);
    this.vel = new THREE.Vector3();
    this.target = new THREE.Vector3(4.2, 0, 1.2);
    this.yaw = 0;
    this.state = 'walk';
    this.idleTimer = 0;

    this.speedBase = 1.85;
    this.walkPhase = 0;
    this.bob = 0;
    this.landSquash = 0;

    this.dischargeTimer = 0.4;
    this.trailTimer = 0;

    // ── 黏液的「拖曳感」狀態 ────────────────────────────────────────
    // 身體的朝向 bodyYaw 會慢半拍才追上移動方向，轉彎時整坨會被拉著走
    this.bodyYaw = 0;
    this.yawRate = 0;
    this.stretch = 0;
    this.wobble = 0;
    this.turnLean = 0;
    this.trailOffset = 0;

    // 滑鼠點擊的目的地（null = 讓牠自己亂逛）
    this.userTarget = null;
    this._markerPulse = 0;

    // ── 軀體容器 ────────────────────────────────────────────────────
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    scene.add(this.group);

    this.bodyHolder = new THREE.Group();
    this.bodyHolder.position.y = 0.62;
    this.group.add(this.bodyHolder);

    this.bodyRadius = 1.2;
    this.body = createSlimeBody({ radius: this.bodyRadius });
    this.bodyHolder.add(this.body.mesh);

    // 從軀體垂到地面的膠質裙擺，把身體和地上的黏液灘連成一坨
    this.skirt = createSlimeSkirt({ topRadius: 1.45, bottomRadius: 2.35, height: 0.72 });
    this.skirt.mesh.position.y = -0.30;
    this.bodyHolder.add(this.skirt.mesh);

    // ── 體內齒輪 ────────────────────────────────────────────────────
    this.gears = [];
    this.gearRig = new THREE.Group();
    this.gearRig.rotation.set(-0.22, 0.18, 0.08);
    this.bodyHolder.add(this.gearRig);

    const gearDefs = [
      { x: -0.06, y: -0.04, r: 0.46, teeth: 8, spin: 2.4, color: 0x9aa7b4, z: -0.10 },
      { x: 0.30, y: 0.06, r: 0.33, teeth: 6, spin: -3.1, color: 0xb8c4d0, z: 0.12 },
      { x: -0.24, y: 0.16, r: 0.25, teeth: 5, spin: 4.2, color: 0xd98a1f, z: 0.16, emissive: 0x3a1c00 },
      { x: 0.12, y: -0.18, r: 0.20, teeth: 4, spin: -5.4, color: 0xcfd8e3, z: 0.20 },
    ];
    this.gearDrift = [];
    for (let i = 0; i < gearDefs.length; i++) {
      const d = gearDefs[i];
      const gear = new Gear({
        radius: d.r,
        teeth: d.teeth,
        color: d.color,
        spin: d.spin,
        emissive: d.emissive ?? 0x000000,
      });
      gear.mesh.position.set(d.x, d.y, d.z);
      this.gearRig.add(gear.mesh);
      this.gears.push(gear);

      // 每顆齒輪在體內有自己的漂移軌道：不在固定位置，而是慢慢繞、慢慢翻
      this.gearDrift.push({
        base: new THREE.Vector3(d.x, d.y, d.z),
        ampX: 0.10 + Math.random() * 0.16,
        ampY: 0.05 + Math.random() * 0.09,
        ampZ: 0.08 + Math.random() * 0.14,
        speed: 0.22 + Math.random() * 0.26,
        phase: Math.random() * Math.PI * 2,
        tumbleX: 0.35 + Math.random() * 0.5,
        tumbleY: 0.3 + Math.random() * 0.55,
        tumbleZ: 0.2 + Math.random() * 0.4,
      });
    }

    // ── 螢光腺體 + 內部光源 ─────────────────────────────────────────
    const glowTex = glowTexture ?? makeRadialTexture(256);
    this.glands = [];
    const glandDefs = [
      { x: 0.34, y: 0.12, z: 0.26, color: 0x25ffd8, light: 0x2affd5, size: 1.5 },
      { x: -0.36, y: -0.02, z: 0.2, color: 0xff9a2e, light: 0xff8a1f, size: 1.3 },
    ];

    for (const g of glandDefs) {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 12),
        new THREE.MeshBasicMaterial({
          color: g.color,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      orb.position.set(g.x, g.y, g.z);
      orb.renderOrder = 4;
      this.bodyHolder.add(orb);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: g.color,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
        })
      );
      halo.position.copy(orb.position);
      halo.scale.setScalar(g.size);
      halo.renderOrder = 6;
      this.bodyHolder.add(halo);

      const light = new THREE.PointLight(g.light, 2.6, 4.5, 2);
      light.position.copy(orb.position);
      this.bodyHolder.add(light);

      this.glands.push({ orb, halo, light, base: g.size });
    }

    // 體內核心（暖橘色心跳）
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffb04a,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.core.position.set(-0.05, -0.02, 0.1);
    this.core.renderOrder = 4;
    this.bodyHolder.add(this.core);

    // ── 體表放電閃爍光點（取代觸手上的電光） ──────────────────────
    this.glints = [];
    for (let i = 0; i < 5; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: i % 2 === 0 ? 0x35ffe0 : 0xff9540,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
        })
      );
      sprite.scale.setScalar(0.35);
      sprite.renderOrder = 7;
      this.bodyHolder.add(sprite);
      this.glints.push({ sprite, timer: Math.random() * 1.6, life: 1 });
    }

    // ── 體內慢慢往上升的氣泡 ────────────────────────────────────────
    // 加在軀體 mesh 底下，所以會跟著黏液一起被拉長、扭轉
    this.bubbles = [];
    const bubbleGeo = new THREE.SphereGeometry(1, 8, 6);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffc37a : 0x8fffe6,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(bubbleGeo, mat);
      mesh.renderOrder = 4;
      this.body.mesh.add(mesh);

      const size = 0.022 + Math.random() * 0.05;
      mesh.scale.setScalar(size);
      this.bubbles.push({
        mesh,
        size,
        baseX: (Math.random() - 0.5) * 1.0,
        baseZ: (Math.random() - 0.5) * 1.0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.16 + Math.random() * 0.22,
        offset: Math.random(),
        wobble: 0.3 + Math.random() * 0.8,
      });
    }

    // ── 體表電弧：偶爾沿著膠體表面爬過去的短閃電 ────────────────────
    this.arcs = [];
    for (let i = 0; i < 3; i++) {
      const positions = new Float32Array(7 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x8ffff0 : 0xffa24a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const line = new THREE.Line(geometry, material);
      line.renderOrder = 6;
      line.frustumCulled = false;
      this.body.mesh.add(line);

      this.arcs.push({
        line,
        timer: 0.4 + Math.random() * 2.0,
        life: 1,
      });
    }

    // ── 地上的黏液灘 + 接觸陰影 ────────────────────────────────────
    this.pool = createSlimePool({ radius: 3.6 });
    this.pool.mesh.position.set(this.pos.x, 0.012, this.pos.z);
    scene.add(this.pool.mesh);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0x000000,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(this.pos.x, 0.008, this.pos.z);
    this.shadow.scale.setScalar(7.6);
    this.shadow.renderOrder = 1;
    scene.add(this.shadow);

    // ── 點擊目的地的小圈圈 ─────────────────────────────────────────
    // 只是一個很淡的貼地圓環，告訴你「牠聽到你要去哪裡了」
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.46, 40),
      new THREE.MeshBasicMaterial({
        color: 0x8ffff0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.024;
    this.marker.renderOrder = 3;
    this.marker.visible = false;
    scene.add(this.marker);
  }

  /**
   * 使用者點擊地面：立刻把目標換過去。
   * 同時壓一下、抖一下，讓「牠收到了」這件事情有身體感。
   */
  setDestination(x, z) {
    const b = this.bounds;
    this.target.set(
      THREE.MathUtils.clamp(x, b.x[0], b.x[1]),
      0,
      THREE.MathUtils.clamp(z, b.z[0], b.z[1])
    );
    this.state = 'walk';
    this.idleTimer = 0;
    this.userTarget = this.target.clone();

    this.landSquash = 1.8;
    this.wobble = 1.4;
    this.dischargeTimer = 0.6;

    this.marker.position.set(this.target.x, 0.024, this.target.z);
    this.marker.visible = true;
    this._markerPulse = 0;

    this.ripples.spawn(this.target, 0x8ffff0);
  }

  /** 挑一個新的漫遊目標 */
  pickTarget() {
    const b = this.bounds;
    for (let i = 0; i < 10; i++) {
      const x = b.x[0] + Math.random() * (b.x[1] - b.x[0]);
      const z = b.z[0] + Math.random() * (b.z[1] - b.z[0]);
      if (Math.hypot(x - this.pos.x, z - this.pos.z) > 3) {
        this.target.set(x, 0, z);
        this.state = 'walk';
        return;
      }
    }
    this.target.set(b.x[0] + Math.random() * (b.x[1] - b.x[0]), 0, 0);
    this.state = 'walk';
  }

  /** 在身體邊緣放電：火花 + 漣漪 */
  discharge(strength = 1) {
    const a = Math.random() * TAU;
    const r = 2.0 + Math.random() * 0.9;
    const p = new THREE.Vector3(
      this.pos.x + Math.cos(a) * r,
      0.05,
      this.pos.z + Math.sin(a) * r
    );
    const color = Math.random() < 0.3 ? 0xff9540 : 0x35ffe0;
    this.ripples.spawn(p, color);
    this.sparks?.burst(p, color, Math.round(5 * strength));
  }

  /** 重新畫一條貼在黏液表面的短電弧 */
  _regenArc(arc) {
    const attr = arc.line.geometry.attributes.position;
    const p = new THREE.Vector3();

    let th = Math.random() * TAU;
    let ph = 0.35 + Math.random() * (Math.PI - 0.7);
    const dTh = (Math.random() < 0.5 ? -1 : 1) * (0.22 + Math.random() * 0.3);
    const dPh = (Math.random() - 0.5) * 0.22;

    for (let i = 0; i < 7; i++) {
      th += dTh * (0.55 + Math.random() * 0.9);
      ph = THREE.MathUtils.clamp(
        ph + dPh + (Math.random() - 0.5) * 0.22,
        0.22,
        Math.PI - 0.22
      );
      slimeSurfacePoint(th, ph, p, 1.022 + Math.random() * 0.022);
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
  }

  update(dt, time) {
    const b = this.bounds;

    // ── 1. 決策：爬向目標 / 停下來休息 ────────────────────────────
    const dx = this.target.x - this.pos.x;
    const dz = this.target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    if (this.state === 'walk') {
      if (dist < 0.55) {
        this.state = 'idle';
        this.idleTimer = this.userTarget ? 1.6 : 1.2 + Math.random() * 2.2;
        if (this.userTarget) this.userTarget = null;
        this.landSquash = 1.5;
        this.wobble = 1.2;
        this.discharge(1.6);
      } else {
        const desiredSpeed = this.speedBase * (dist < 1.6 ? 0.6 + dist * 0.25 : 1.0);
        const desiredX = (dx / dist) * desiredSpeed;
        const desiredZ = (dz / dist) * desiredSpeed;
        const k = 1 - Math.exp(-dt * 4.6);
        this.vel.x += (desiredX - this.vel.x) * k;
        this.vel.z += (desiredZ - this.vel.z) * k;
      }
    } else {
      this.vel.multiplyScalar(Math.exp(-dt * 3.2));
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) this.pickTarget();

      // 待機時偶爾在身邊放一下電
      this.dischargeTimer -= dt;
      if (this.dischargeTimer <= 0) {
        this.discharge(0.7);
        this.dischargeTimer = 1.4 + Math.random() * 2.4;
      }
    }

    // ── 2. 位移與邊界 ──────────────────────────────────────────────
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, b.x[0], b.x[1]);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, b.z[0], b.z[1]);

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const speedNorm = Math.min(1, speed / this.speedBase);

    // ── 3. 轉向：身體的朝向慢慢追，才會有「被拖著走」的感覺 ───────
    let yawDelta = 0;
    if (speed > 0.12) {
      const targetYaw = Math.atan2(this.vel.x, this.vel.z);
      const prev = this.yaw;
      this.yaw = lerpAngle(this.yaw, targetYaw, 1 - Math.exp(-dt * 2.6));
      yawDelta = wrapAngle(this.yaw - prev);
    } else if (dist > 0.06) {
      // 停著的時候，身體也會慢慢轉向目標
      const targetYaw = Math.atan2(dx, dz);
      const prev = this.yaw;
      this.yaw = lerpAngle(this.yaw, targetYaw, 1 - Math.exp(-dt * 1.8));
      yawDelta = wrapAngle(this.yaw - prev);
    }
    this.yawRate = yawDelta / Math.max(dt, 1e-4);

    // 身體（齒輪、裙擺）的朝向落後 yaw 一大截：這是黏液的重點
    const lag = wrapAngle(this.yaw - this.bodyYaw);
    this.bodyYaw += lag * (1 - Math.exp(-dt * 1.15));
    this.turnLean +=
      (THREE.MathUtils.clamp(this.yawRate * 0.055, -0.16, 0.16) - this.turnLean) *
      (1 - Math.exp(-dt * 5.0));

    // 移動時整個身體會被「拖」在後面，衝刺越久拉得越長
    const targetStretch = speedNorm * 0.20;
    this.stretch += (targetStretch - this.stretch) * (1 - Math.exp(-dt * 3.0));
    const targetTrail = speedNorm * 0.13;
    this.trailOffset += (targetTrail - this.trailOffset) * (1 - Math.exp(-dt * 2.6));
    // 點擊或落地的果凍餘震
    this.wobble *= Math.exp(-dt * 2.8);

    // ── 4. 蠕動：身體上下起伏 + 往前拉伸 ─────────────────────────
    this.walkPhase += dt * (1.5 + speed * 2.8);
    this.bob =
      Math.sin(this.walkPhase * 2.1) * 0.032 * speedNorm +
      Math.sin(this.walkPhase * 1.13) * 0.014 +
      Math.sin(time * 1.4) * 0.01;

    this.landSquash = Math.max(0, this.landSquash - dt * 3.0);
    const squash = Math.sin(this.walkPhase * 2.1) * 0.045 * speedNorm + this.landSquash * 0.08;

    this.group.position.set(this.pos.x, this.bob, this.pos.z);

    // 容器跟著（落後的）bodyYaw；軀體本身再轉向真正的移動方向，
    // 兩者之間的差就是黏液扭轉、被拖著走的來源
    this.bodyHolder.rotation.y = this.bodyYaw;
    this.bodyHolder.rotation.x = -0.10 * speedNorm + Math.sin(this.walkPhase * 2.1) * 0.012;
    this.bodyHolder.rotation.z = this.turnLean;

    // 史萊姆伸縮：前後拉長、左右收窄，外加點擊造成的果凍晃動
    const stretch = this.stretch + this.wobble * 0.10;
    this.body.mesh.rotation.y = wrapAngle(this.yaw - this.bodyYaw);
    this.body.mesh.scale.set(
      this.bodyRadius * (1 - squash * 0.6) * (1 - stretch * 0.5),
      this.bodyRadius * (1 - squash * 0.9) * (1 + this.wobble * 0.05),
      this.bodyRadius * (1 + squash) * (1 + stretch)
    );
    this.body.mesh.position.set(0, 0, -this.trailOffset);

    this.skirt.mesh.scale.set(
      1 + this.landSquash * 0.16,
      1,
      1 + this.landSquash * 0.16 + stretch * 0.8
    );
    this.skirt.mesh.position.z = -this.trailOffset * 1.8;

    // ── 5. 著色器 / 機械 / 腺體動畫 ───────────────────────────────
    this.body.uniforms.uTime.value = time;
    this.body.uniforms.uWalk.value = speedNorm;
    this.skirt.uniforms.uTime.value = time;
    this.pool.uniforms.uTime.value = time;

    // 齒輪不再釘在固定位置：整組慢慢轉，每一顆再沿自己的軌道在體內漂
    this.gearRig.rotation.y += dt * 0.05;
    this.gearRig.rotation.x = -0.12 + Math.sin(time * 0.21) * 0.1;

    for (let i = 0; i < this.gears.length; i++) {
      const gear = this.gears[i];
      const d = this.gearDrift[i];
      gear.mesh.position.set(
        d.base.x + Math.sin(time * d.speed + d.phase) * d.ampX,
        d.base.y + Math.sin(time * d.speed * 1.37 + d.phase * 1.7) * d.ampY,
        d.base.z + Math.cos(time * d.speed * 0.81 + d.phase * 2.1) * d.ampZ
      );
      gear.mesh.rotation.x = Math.sin(time * d.tumbleX + d.phase) * 1.1;
      gear.mesh.rotation.y = Math.cos(time * d.tumbleY + d.phase * 1.4) * 1.3;
      gear.update(dt, 1.0);
    }

    const breathe = 1 + Math.sin(time * 2.0) * 0.12;
    for (let i = 0; i < this.glands.length; i++) {
      const g = this.glands[i];
      const pulse = breathe + Math.sin(time * 3.1 + i * 2.0) * 0.1;
      g.orb.scale.setScalar(pulse);
      g.halo.scale.setScalar(g.base * pulse * 1.15);
      g.light.intensity = 2.2 + Math.sin(time * 2.4 + i * 1.7) * 0.8;
    }
    this.core.scale.setScalar(1 + Math.sin(time * 2.6) * 0.16);

    // 體表閃爍：不定時在表面亮起一顆光點
    for (const g of this.glints) {
      g.timer -= dt;
      if (g.life < 1) g.life += dt / 0.18;
      if (g.timer <= 0 && g.life >= 1) {
        g.timer = 0.22 + Math.random() * 1.3;
        g.life = 0;
        const th = Math.random() * TAU;
        const ph = Math.acos(2 * Math.random() - 1);
        // 把球面上的點套用和頂點著色器一樣的「壓扁 + 攤開」，
        // 這樣光點才會貼在那灘黏液真正的表面上，而不是浮在球外
        let sx = Math.sin(ph) * Math.cos(th);
        let sy = Math.cos(ph);
        let sz = Math.sin(ph) * Math.sin(th);
        sy = Math.max(sy * 0.60, -0.52) * 1.02;
        const bulge = 1 - THREE.MathUtils.smoothstep(sy, -0.65, 0.30);
        const spread = 1 + bulge * 0.62;
        g.sprite.position.set(
          sx * spread * this.bodyRadius,
          sy * this.bodyRadius,
          sz * spread * 1.05 * this.bodyRadius
        );
        g.sprite.scale.setScalar(0.16 + Math.random() * 0.34);
      }
      g.sprite.material.opacity = Math.sin(Math.min(1, g.life) * Math.PI) * 0.95;
    }

    // ── 體內氣泡：慢慢從底部升上來、到表面就消失 ──────────────────
    for (const b of this.bubbles) {
      const t = (time * b.speed + b.offset) % 1;
      const fade = Math.sin(t * Math.PI);
      b.mesh.position.set(
        b.baseX * (1 - t * 0.4) + Math.sin(time * b.wobble + b.phase) * 0.045,
        -0.44 + t * 0.78,
        b.baseZ * (1 - t * 0.45) + Math.cos(time * b.wobble * 0.8 + b.phase) * 0.045
      );
      b.mesh.material.opacity = fade * 0.5;
      b.mesh.scale.setScalar(b.size * (0.72 + fade * 0.7));
    }

    // ── 體表電弧：不定時沿著表面爬一小段 ────────────────────────
    for (const arc of this.arcs) {
      arc.timer -= dt;
      if (arc.timer <= 0 && arc.life >= 1) {
        this._regenArc(arc);
        arc.life = 0;
        arc.timer = 1.1 + Math.random() * 2.6;
      }
      if (arc.life < 1) {
        arc.life += dt / 0.16;
        arc.line.material.opacity = Math.sin(Math.min(1, arc.life) * Math.PI) * 0.85;
      }
    }

    // 爬行時持續放電
    if (speed > 0.25) {
      this.dischargeTimer -= dt;
      if (this.dischargeTimer <= 0) {
        this.discharge(0.8);
        this.dischargeTimer = 0.5 + Math.random() * 0.9;
      }
    }

    // ── 6. 黏液灘、爬行痕跡與陰影貼地 ─────────────────────────────
    this.pool.mesh.position.set(this.pos.x, 0.012, this.pos.z);
    const poolPulse = 1 + speedNorm * 0.05 + Math.sin(time * 1.25) * 0.012;
    this.pool.mesh.scale.setScalar(poolPulse);
    this.shadow.position.set(this.pos.x, 0.008, this.pos.z);
    const shadowScale = 7.6 * (1 - this.bob * 1.4);
    this.shadow.scale.setScalar(shadowScale);

    if (speed > 0.2) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.14;
        this.trail?.spawn(this.pos.x, this.pos.z, this.yaw);
      }
    }

    // ── 7. 目的地圈圈：行進時淡淡呼吸，抵達後縮小消失 ─────────────
    if (this.userTarget) {
      this._markerPulse += dt;
      this.marker.visible = true;
      this.marker.material.opacity = 0.45 + Math.sin(this._markerPulse * 5.0) * 0.18;
      this.marker.scale.setScalar(1 + Math.sin(this._markerPulse * 2.4) * 0.09);
    } else if (this.marker.visible) {
      this.marker.material.opacity *= Math.exp(-dt * 5.0);
      if (this.marker.material.opacity < 0.01) this.marker.visible = false;
    }
  }
}
