import * as THREE from '../vendor/three.module.js';

const SEGMENTS = 22;

/**
 * 背景的電磁風暴。
 *
 * 廢墟上空每隔一兩秒就打一次閃電：
 *   - 用一條會重新折線的 Line 畫出鋸齒狀的電弧
 *   - 電弧在極短時間內閃兩三下（不是穩定亮著）
 *   - 同時在落點放一顆淡藍色的光暈，並且點亮一盞點光源，
 *     讓遠處的廢墟瞬間被照亮一下
 *
 * 全部用物件池：電弧、光暈、光源都只有固定幾個，重複使用，不會每幀新建東西。
 */
export class Storm {
  constructor(scene, { glowTexture, boltCount = 5 } = {}) {
    this.scene = scene;
    this.bolts = [];
    this.timer = 0.8;

    for (let i = 0; i < boltCount; i++) {
      const positions = new Float32Array(SEGMENTS * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: 0xbdf0ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });

      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      line.visible = false;
      line.renderOrder = 2;
      scene.add(line);

      this.bolts.push({
        line,
        geometry,
        material,
        positions,
        life: 1,
        duration: 0.6,
        phase: 0,
        refresh: 0,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
      });
    }

    this.cursor = 0;

    // 落點的光暈
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture ?? null,
        color: 0xcdefff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        fog: false,
      })
    );
    this.flash.scale.setScalar(30);
    this.flash.visible = false;
    this.flash.renderOrder = 2;
    scene.add(this.flash);

    // 橫向的拉長光斑：閃電打在遠處時，會有一道貼著地平線的光
    this.flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture ?? null,
        color: 0xbfe6ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        fog: false,
      })
    );
    this.flare.scale.set(36, 2.4, 1);
    this.flare.visible = false;
    this.flare.renderOrder = 2;
    scene.add(this.flare);

    // 閃電瞬間照亮廢墟的點光源
    this.flashLight = new THREE.PointLight(0xa8dcff, 0, 120, 2);
    this.flashLight.visible = false;
    scene.add(this.flashLight);

    this.flashPos = new THREE.Vector3();
  }

  /** 產生一次落雷 */
  strike() {
    const bolt = this.bolts[this.cursor];
    this.cursor = (this.cursor + 1) % this.bolts.length;

    // 七成是從天上打下來的直雷，三成是在廢墟之間橫著爬的電弧
    const vertical = Math.random() < 0.7;
    if (vertical) {
      const x = -34 + Math.random() * 62;
      const z = -20 - Math.random() * 26;
      bolt.start.set(x, 13 + Math.random() * 9, z);
      bolt.end.set(x + (Math.random() - 0.5) * 7, 0.4 + Math.random() * 2.4, z + (Math.random() - 0.5) * 5);
      this.flashPos.set(x, 3.0, z);
    } else {
      const x = -28 + Math.random() * 50;
      const z = -20 - Math.random() * 20;
      const y = 3.0 + Math.random() * 4.5;
      bolt.start.set(x, y, z);
      bolt.end.set(x + 8 + Math.random() * 16, y + (Math.random() - 0.5) * 3.0, z + (Math.random() - 0.5) * 6);
      this.flashPos.set((bolt.start.x + bolt.end.x) / 2, y, z);
    }

    this._jagged(bolt);
    bolt.line.visible = true;
    bolt.life = 0;
    bolt.duration = 0.45 + Math.random() * 0.4;
    bolt.phase = Math.random() * 10;
    bolt.refresh = 0.06;

    this.flash.position.copy(this.flashPos);
    this.flash.visible = true;
    this.flash.material.opacity = 0;

    this.flare.position.copy(this.flashPos);
    this.flare.visible = true;
    this.flare.material.opacity = 0;

    this.flashLight.position.copy(this.flashPos);
    this.flashLight.visible = true;
  }

  /** 把 start→end 之間折成鋸齒狀，並寫進 buffer */
  _jagged(bolt) {
    const { positions, start, end } = bolt;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const len = Math.hypot(dx, dy, dz) || 1;

    // 找兩個垂直於主方向的向量，用來把點往旁邊推
    const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
    let ref = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.y) > 0.9) ref.set(1, 0, 0);
    const sideA = new THREE.Vector3().crossVectors(dir, ref).normalize();
    const sideB = new THREE.Vector3().crossVectors(dir, sideA).normalize();

    for (let i = 0; i < SEGMENTS; i++) {
      const t = i / (SEGMENTS - 1);
      // 中段可以晃得最兇，兩端固定在端點
      const spread = Math.sin(t * Math.PI) * 2.0 + 0.05;
      const a = (Math.random() - 0.5) * spread;
      const b = (Math.random() - 0.5) * spread;

      positions[i * 3 + 0] = start.x + dx * t + sideA.x * a + sideB.x * b;
      positions[i * 3 + 1] = start.y + dy * t + sideA.y * a + sideB.y * b;
      positions[i * 3 + 2] = start.z + dz * t + sideA.z * a + sideB.z * b;
    }

    bolt.geometry.attributes.position.needsUpdate = true;
  }

  update(dt, time) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.strike();
      // 之後再隨機補一兩道比較弱的電弧，讓整片天空同時在放電
      if (Math.random() < 0.55) this.strike();
      this.timer = 1.2 + Math.random() * 2.6;
    }

    for (const bolt of this.bolts) {
      if (!bolt.line.visible) continue;

      bolt.life += dt / bolt.duration;
      if (bolt.life >= 1) {
        bolt.line.visible = false;
        bolt.material.opacity = 0;
        continue;
      }

      // 電弧不斷重新折線，看起來才會「爬」
      bolt.refresh -= dt;
      if (bolt.refresh <= 0) {
        this._jagged(bolt);
        bolt.refresh = 0.05 + Math.random() * 0.06;
      }

      const t = bolt.life;
      const blink = Math.sin(t * 46 + bolt.phase) * 0.5 + 0.5;
      bolt.material.opacity = Math.pow(1 - t, 1.2) * (0.25 + blink * 0.75);
    }

    if (this.flash.visible) {
      const t = Math.min(1, this.flash.material.opacity + 0.0001);
      // 光暈跟著同一顆計時器淡出：直接用最近一道電弧的殘留時間近似
      let alive = 0;
      for (const bolt of this.bolts) {
        if (bolt.line.visible) alive = Math.max(alive, bolt.material.opacity);
      }
      this.flash.material.opacity = alive * 0.4;
      this.flashLight.intensity = alive * 900;
      if (alive <= 0.001) {
        this.flash.visible = false;
        this.flashLight.visible = false;
        this.flashLight.intensity = 0;
      }
      void t;
    }
  }
}
