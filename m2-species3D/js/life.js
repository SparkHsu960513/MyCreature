import * as THREE from '../vendor/three.module.js';
import { makeRandom, range } from './random.js';

/**
 * 廢墟裡的「其他生物」。
 *
 * 主角不是世界上唯一的東西。遠景的殘骸之間，還有一些小型的同類：
 * 貼地滑行的迷你史萊姆（跟主角同源，但小得多、顏色更暗）。
 *
 * 牠們全部都是低成本的低多邊形模型：這個檔案的目的不是做得多精緻，
 * 而是讓背景「有東西在動」，讓整個廢墟看起來還活著。
 * 位置與速度都用固定種子，所以每次重新整理牠們走的路線都一樣。
 */
export class BackgroundLife {
  constructor({ glowTexture, seed = 20261113 } = {}) {
    this.group = new THREE.Group();
    this.glowTexture = glowTexture;
    this.rand = makeRandom(seed);

    this.slimes = [];

    this._buildSlimes(7);
  }

  // ── 迷你史萊姆：一顆被壓扁的暗綠色膠球，貼在地上滑 ──────────────────
  _buildSlimes(count) {
    const rand = this.rand;
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1d4a40,
      emissive: 0x0d3b33,
      emissiveIntensity: 0.75,
      roughness: 0.32,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
      flatShading: true,
    });
    const glowMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: 0x2effd0,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < count; i++) {
      const holder = new THREE.Group();
      const body = new THREE.Mesh(geometry, material);
      const size = range(rand, 0.22, 0.52);
      body.scale.set(size * range(rand, 1.1, 1.5), size * 0.62, size * range(rand, 1.0, 1.35));
      body.position.y = size * 0.4;
      holder.add(body);

      const glow = new THREE.Sprite(glowMaterial);
      glow.scale.setScalar(size * 3.4);
      glow.position.y = size * 0.5;
      holder.add(glow);

      const baseZ = range(rand, -28, -11);
      const baseX = range(rand, -30, 30);
      holder.position.set(baseX, 0, baseZ);
      this.group.add(holder);

      this.slimes.push({
        holder,
        body,
        size,
        baseX,
        baseZ,
        phase: rand() * Math.PI * 2,
        speed: range(rand, 0.18, 0.42),
        rangeX: range(rand, 1.5, 6.0),
        hop: range(rand, 0.6, 1.4),
      });
    }
  }

  update(time) {
    // 迷你史萊姆：左右慢慢滑、身體一壓一彈
    for (const s of this.slimes) {
      const t = time * s.speed + s.phase;
      s.holder.position.x = s.baseX + Math.sin(t) * s.rangeX;
      s.holder.position.z = s.baseZ + Math.cos(t * 0.7) * 1.2;
      s.holder.rotation.y = Math.cos(t) * 0.7;

      const pulse = Math.abs(Math.sin(t * 1.7));
      s.body.scale.y = s.size * (0.5 + pulse * 0.22);
      s.body.scale.x = s.size * (1.35 - pulse * 0.12);
      s.body.position.y = s.size * 0.4 + pulse * s.size * 0.12;
    }

  }
}
