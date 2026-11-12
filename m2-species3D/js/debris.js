import * as THREE from '../vendor/three.module.js';
import { makeRandom, range } from './random.js';

/**
 * 漂浮在廢墟上空的大型殘骸與土塊。
 *
 * 這個世界不太正常：一大塊一大塊的水泥、泥土和鋼板違反重力地浮在半空中，
 * 極慢地上下浮沉、慢慢翻轉。它們分佈在畫面左右兩側與遠處，
 * 不會擋住中央那隻生物，但會讓整個背景看起來「有事情在發生」。
 *
 * 三種東西：
 *   1. 帶著外露鋼筋的水泥塊
 *   2. 連著小石頭的泥土團
 *   3. 歪斜的金屬板
 */
export class FloatingDebris {
  constructor({ materials, seed = 20261113, count = 16 } = {}) {
    this.group = new THREE.Group();
    this.items = [];
    const rand = makeRandom(seed);

    for (let i = 0; i < count; i++) {
      const chunk = new THREE.Group();
      const kind = rand();

      if (kind < 0.5) {
        this._concreteChunk(chunk, rand, materials);
      } else if (kind < 0.8) {
        this._soilClod(chunk, rand, materials);
      } else {
        this._steelPlate(chunk, rand, materials);
      }

      const side = rand() > 0.5 ? 1 : -1;
      const base = new THREE.Vector3(
        side * range(rand, 6, 44),
        range(rand, 4.5, 15.5),
        range(rand, -60, -24)
      );

      chunk.position.copy(base);
      chunk.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      this.group.add(chunk);

      this.items.push({
        chunk,
        base,
        phase: rand() * Math.PI * 2,
        speed: range(rand, 0.22, 0.62),
        amp: range(rand, 0.25, 0.9),
        sway: range(rand, 0.2, 0.75),
        spin: new THREE.Vector3(
          range(rand, -0.10, 0.10),
          range(rand, -0.09, 0.09),
          range(rand, -0.10, 0.10)
        ),
      });
    }
  }

  _concreteChunk(parent, rand, materials) {
    const w = range(rand, 2.4, 6.5);
    const h = range(rand, 1.2, 3.2);
    const d = range(rand, 1.6, 4.5);

    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.concrete);
    parent.add(block);

    // 從斷面伸出來的鋼筋
    const count = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const len = range(rand, 0.9, 2.8);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, len, 4),
        materials.metal
      );
      bar.position.set(
        range(rand, -w * 0.4, w * 0.4),
        range(rand, -h * 0.4, h * 0.4),
        d * 0.5 + len * 0.35
      );
      bar.rotation.set(range(rand, -0.6, 0.6), 0, range(rand, -0.8, 0.8));
      parent.add(bar);
    }

    // 黏在底下的碎塊
    if (rand() < 0.6) {
      const bit = new THREE.Mesh(
        new THREE.DodecahedronGeometry(range(rand, 0.35, 0.8), 0),
        materials.charred
      );
      bit.position.set(range(rand, -w * 0.4, w * 0.4), -h * 0.55, range(rand, -d * 0.3, d * 0.3));
      parent.add(bit);
    }
  }

  _soilClod(parent, rand, materials) {
    const r = range(rand, 1.1, 3.0);
    const clod = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), materials.soil);
    clod.scale.set(range(rand, 0.85, 1.45), range(rand, 0.6, 1.0), range(rand, 0.85, 1.4));
    parent.add(clod);

    // 卡在土團裡的小石頭
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(range(rand, 0.12, 0.36), 0),
        materials.concrete
      );
      rock.position.set(
        range(rand, -r * 0.8, r * 0.8),
        range(rand, -r * 0.4, r * 0.5),
        range(rand, -r * 0.8, r * 0.8)
      );
      parent.add(rock);
    }
  }

  _steelPlate(parent, rand, materials) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(range(rand, 2.0, 5.0), range(rand, 0.16, 0.34), range(rand, 1.8, 4.2)),
      materials.metal
    );
    parent.add(plate);

    // 折彎的一角
    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(range(rand, 0.6, 1.4), 0.14, range(rand, 0.8, 1.8)),
      materials.rust
    );
    flap.position.set(range(rand, 0.6, 1.6), range(rand, -0.1, 0.25), range(rand, -0.5, 0.5));
    flap.rotation.set(range(rand, -0.9, 0.9), range(rand, -0.6, 0.6), range(rand, -0.9, 0.9));
    parent.add(flap);
  }

  update(time) {
    for (const item of this.items) {
      const { chunk, base, phase, speed, amp, sway, spin } = item;
      chunk.position.set(
        base.x + Math.sin(time * speed * 0.7 + phase) * sway,
        base.y + Math.sin(time * speed + phase) * amp,
        base.z + Math.cos(time * speed * 0.5 + phase * 1.3) * sway * 0.6
      );
      chunk.rotation.x += spin.x * 0.016;
      chunk.rotation.y += spin.y * 0.016;
      chunk.rotation.z += spin.z * 0.016;
    }
  }
}
