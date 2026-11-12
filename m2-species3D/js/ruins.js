import * as THREE from '../vendor/three.module.js';
import { makeRandom, range } from './random.js';
import {
  makeConcreteTexture,
  makeFacadeTexture,
  makeRustTexture,
  makeSoilTexture,
} from './textures.js';

/**
 * 廢墟遠景。
 *
 * 場景設定在一個被電磁風暴掃過的舊觀測場：視線遠方是一整排崩塌的塔樓、
 * 折斷的柱子、倒塌的高架橋、廢棄的冷卻塔、懸在半空的金屬骨架，
 * 地上散落鋼筋、碎石與垂落的電纜。
 *
 * 所有東西都用固定種子擺放，所以每次重新整理都是同一個廢墟。
 * 配色刻意偏冷（灰藍水泥、鏽鐵），靠左後方的暖色太陽打出逆光輪廓，
 * 再讓 fog 把遠景刷成一片灰塵色，做出冷硬結構 vs 暖光的強對比。
 */
export class Ruins {
  constructor({ seed = 20261112 } = {}) {
    this.group = new THREE.Group();
    const rand = makeRandom(seed);

    // 用 Canvas 現畫的貼圖：讓遠景的水泥、窗戶與鏽鐵有真正的污漬與細節，
    // 而不是一大塊一大塊的素面色塊
    const concreteMap = makeConcreteTexture(11);
    concreteMap.repeat.set(2, 2);
    const facadeMap = makeFacadeTexture(23);
    const rustMap = makeRustTexture(37);
    rustMap.repeat.set(2, 2);
    const soilMap = makeSoilTexture(53);
    soilMap.repeat.set(2, 2);

    this.materials = {
      concrete: new THREE.MeshStandardMaterial({
        color: 0x9aa0a6,
        map: concreteMap,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
      }),
      facade: new THREE.MeshStandardMaterial({
        color: 0x9aa0a6,
        map: facadeMap,
        roughness: 0.92,
        metalness: 0.05,
        flatShading: true,
      }),
      charred: new THREE.MeshStandardMaterial({
        color: 0x545b62,
        roughness: 0.98,
        metalness: 0.03,
        flatShading: true,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0x7c858d,
        roughness: 0.48,
        metalness: 0.82,
        flatShading: true,
      }),
      rust: new THREE.MeshStandardMaterial({
        color: 0xa06a46,
        map: rustMap,
        roughness: 0.86,
        metalness: 0.35,
        flatShading: true,
      }),
      soil: new THREE.MeshStandardMaterial({
        color: 0x8a7258,
        map: soilMap,
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true,
      }),
    };

    this._skyline(rand);
    this._megastructures(rand);
    this._brokenWalls(rand);
    this._columns(rand);
    this._flankDebris(rand);
    this._rubble(rand);
    this._girders(rand);
    this._cables(rand);
    this._fineDetails(rand);
  }

  /** 最遠處的天際線：一大排高矮不一、頂端崩掉的塔樓 */
  _skyline(rand) {
    const count = 34;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = -100 + t * 200 + range(rand, -8, 8);
      const z = range(rand, -66, -102);
      const w = range(rand, 5, 16);
      const d = range(rand, 5, 13);
      // 用 pow 讓大部分是矮樓、少數是特別高的塔
      const h = 6 + Math.pow(rand(), 1.7) * 34;

      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        rand() > 0.72 ? this.materials.concrete : this.materials.facade
      );
      tower.position.set(x, h / 2 - 1.6, z);
      tower.rotation.y = range(rand, -0.5, 0.5);
      this.group.add(tower);

      // 崩掉的上半段：一小塊歪斜的殘骸卡在樓頂
      if (rand() < 0.6) {
        const sh = range(rand, 1.0, 6.0);
        const sw = w * range(rand, 0.35, 0.7);
        const chunk = new THREE.Mesh(
          new THREE.BoxGeometry(sw, sh, d * range(rand, 0.4, 0.8)),
          this.materials.charred
        );
        chunk.position.set(
          x + range(rand, -w * 0.6, w * 0.6),
          h - 1.6 + range(rand, -1.0, 3.0),
          z + range(rand, -d * 0.4, d * 0.4)
        );
        chunk.rotation.set(range(rand, -0.4, 0.4), range(rand, 0, Math.PI), range(rand, -0.5, 0.5));
        this.group.add(chunk);
      }
    }
  }

  /** 巨大的工業殘骸：斷掉的高架橋、冷卻塔、懸空的金屬骨架、倒在半空的巨環 */
  _megastructures(rand) {
    // ── 斷成三截的高架橋，橫跨整個遠景 ─────────────────────────────
    const deckY = 7.4;
    for (let seg = 0; seg < 3; seg++) {
      const len = range(rand, 26, 38);
      const x = -56 + seg * 40;
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.9, 7.5),
        this.materials.concrete
      );
      deck.position.set(x, deckY + range(rand, -0.5, 0.6), -40 - seg * 2);
      deck.rotation.set(range(rand, -0.03, 0.03), range(rand, -0.06, 0.06), range(rand, -0.09, 0.09));
      this.group.add(deck);

      // 橋墩
      for (let i = 0; i < 2; i++) {
        const pier = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, deckY, 2.4),
          this.materials.charred
        );
        pier.position.set(x + (i === 0 ? -len * 0.3 : len * 0.3), deckY / 2, -40 - seg * 2);
        this.group.add(pier);
      }
    }

    // ── 兩座冷卻塔（上緣崩掉） ─────────────────────────────────────
    for (const [cx, cz, h] of [
      [-44, -58, 18],
      [49, -66, 22],
    ]) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(4.6, 7.4, h, 22, 1, true),
        this.materials.concrete
      );
      tower.position.set(cx, h / 2 - 1, cz);
      this.group.add(tower);
    }

    // ── 懸在半空的巨大金屬骨架（像沒蓋完的廠房） ───────────────────
    this._frame(-26, -48, 14, 15, 10, rand);
    this._frame(18, -55, 12, 12, 9, rand);
    this._frame(42, -44, 8, 9, 7, rand);

    // ── 倒在半空的巨環：半埋在土裡、歪斜地伸向天空 ─────────────────
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(10.5, 0.62, 8, 44, Math.PI * 1.35),
      this.materials.metal
    );
    ring.position.set(-30, 4.5, -52);
    ring.rotation.set(-1.05, 0.35, -0.24);
    this.group.add(ring);

    // ── 倉庫 / 貨櫃：中景一長排低矮的鏽鐵盒 ─────────────────────────
    for (let i = 0; i < 12; i++) {
      const x = range(rand, -52, 52);
      const z = range(rand, -36, -52);
      const w = range(rand, 4, 11);
      const h = range(rand, 2.4, 4.2);
      const d = range(rand, 2.6, 5.5);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        rand() > 0.55 ? this.materials.rust : this.materials.metal
      );
      box.position.set(x, h / 2 - 0.2, z);
      box.rotation.set(0, range(rand, -0.4, 0.4), range(rand, -0.06, 0.06));
      this.group.add(box);
    }
  }

  /** 用細樑組成的鏤空鋼架（有柱、有橫樑、有斜撐） */
  _frame(x, z, w, h, d, rand) {
    const add = (sx, sy, sz, px, py, pz, rz = 0) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.materials.metal);
      beam.position.set(px, py, pz);
      beam.rotation.z = rz;
      this.group.add(beam);
    };

    const t = 0.26;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add(t, h, t, x + sx * w * 0.5, h * 0.5, z + sz * d * 0.5);
      }
    }

    for (const y of [h * 0.36, h * 0.7, h]) {
      add(w, t, t, x, y, z - d * 0.5);
      add(w, t, t, x, y, z + d * 0.5);
      add(t, t, d, x - w * 0.5, y, z);
      add(t, t, d, x + w * 0.5, y, z);
    }

    // 幾根歪掉的斜撐
    for (let i = 0; i < 3; i++) {
      const len = Math.hypot(w, h * range(rand, 0.3, 0.7));
      add(0.18, len, 0.18, x + range(rand, -w * 0.35, w * 0.35), h * 0.5, z - d * 0.5, range(rand, -0.9, 0.9));
    }
  }

  /** 中景的斷牆：倒塌的樓板、剩下半截的牆面 */
  _brokenWalls(rand) {
    for (let i = 0; i < 18; i++) {
      const x = range(rand, -48, 48);
      const z = range(rand, -34, -17);
      const w = range(rand, 3.5, 12);
      const h = range(rand, 1.8, 7.5);
      const d = range(rand, 0.4, 1.2);

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        rand() > 0.6 ? this.materials.charred : this.materials.concrete
      );
      wall.position.set(x, h / 2 - 0.15, z);
      wall.rotation.set(range(rand, -0.08, 0.08), range(rand, -0.9, 0.9), range(rand, -0.18, 0.18));
      this.group.add(wall);

      // 倒在牆邊的樓板
      if (rand() < 0.7) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(w * range(rand, 0.5, 1.1), 0.26, range(rand, 2.0, 5.5)),
          this.materials.concrete
        );
        slab.position.set(
          x + range(rand, -w * 0.7, w * 0.7),
          range(rand, 0.1, 1.4),
          z + range(rand, -2.5, 2.5)
        );
        slab.rotation.set(range(rand, -0.5, 0.5), range(rand, 0, Math.PI), range(rand, -0.3, 0.3));
        this.group.add(slab);
      }
    }
  }

  /** 折斷的柱子：直立、傾斜、倒在地上 */
  _columns(rand) {
    for (let i = 0; i < 14; i++) {
      const x = range(rand, -42, 42);
      const z = range(rand, -32, -14);
      const h = range(rand, 2.6, 9.0);
      const r = range(rand, 0.3, 0.75);

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.8, r, h, 8),
        this.materials.concrete
      );
      column.position.set(x, h / 2 - 0.2, z);
      column.rotation.set(range(rand, -0.16, 0.16), range(rand, 0, Math.PI), range(rand, -0.36, 0.36));
      this.group.add(column);

      // 斷掉的柱頭
      if (rand() < 0.5) {
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(r * 2.2, r * 0.5, r * 2.2),
          this.materials.concrete
        );
        cap.position.set(x + range(rand, -1.4, 1.4), range(rand, 0.1, 0.6), z + range(rand, -1.4, 1.4));
        cap.rotation.set(range(rand, 0, 1.2), range(rand, 0, 3.1), range(rand, 0, 1.2));
        this.group.add(cap);
      }
    }
  }

  /** 靠近鏡頭、但只在畫面左右邊緣的殘骸，用來框住構圖 */
  _flankDebris(rand) {
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * range(rand, 12.0, 26.0);
      const z = range(rand, -20, -6);
      const h = range(rand, 1.0, 4.6);

      const debris = new THREE.Mesh(
        new THREE.BoxGeometry(range(rand, 1.2, 4.2), h, range(rand, 1.2, 3.8)),
        this.materials.charred
      );
      debris.position.set(x, h / 2 - 0.2, z);
      debris.rotation.set(range(rand, -0.25, 0.25), range(rand, 0, Math.PI), range(rand, -0.45, 0.45));
      this.group.add(debris);
    }
  }

  /** 地上的碎石堆 */
  _rubble(rand) {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < 170; i++) {
      const a = rand() * Math.PI * 2;
      const dist = range(rand, 9, 52);
      const x = Math.cos(a) * dist;
      const z = -4 - Math.abs(Math.sin(a)) * dist;

      const rock = new THREE.Mesh(
        geo,
        rand() > 0.84 ? this.materials.rust : this.materials.concrete
      );
      const s = range(rand, 0.16, 1.05);
      rock.position.set(x, s * 0.22, z);
      rock.scale.set(s, s * range(rand, 0.3, 0.62), s * range(rand, 0.7, 1.1));
      rock.rotation.set(range(rand, 0, Math.PI), range(rand, 0, Math.PI), range(rand, 0, Math.PI));
      this.group.add(rock);
    }
  }

  /** 插在地上的彎曲鋼筋 / 型鋼 */
  _girders(rand) {
    for (let i = 0; i < 22; i++) {
      const x = range(rand, -44, 44);
      const z = range(rand, -38, -8);
      const len = range(rand, 2.2, 8.0);

      const girder = new THREE.Mesh(
        new THREE.BoxGeometry(range(rand, 0.07, 0.18), len, range(rand, 0.07, 0.18)),
        this.materials.metal
      );
      girder.position.set(x, len * 0.32, z);
      girder.rotation.set(range(rand, -1.2, 1.2), range(rand, 0, Math.PI), range(rand, -1.1, 1.1));
      this.group.add(girder);
    }
  }

  /** 垂在兩根柱子之間、被風扯斷的電纜 */
  _cables(rand) {
    for (let i = 0; i < 7; i++) {
      const x1 = range(rand, -38, 20);
      const x2 = x1 + range(rand, 8, 26);
      const z1 = range(rand, -36, -12);
      const z2 = z1 + range(rand, -6, 6);
      const y1 = range(rand, 3.0, 8.0);
      const y2 = y1 + range(rand, -2.0, 2.0);
      const sag = range(rand, 1.0, 3.6);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x1, y1, z1),
        new THREE.Vector3((x1 + x2) / 2, Math.min(y1, y2) - sag, (z1 + z2) / 2),
        new THREE.Vector3(x2, Math.max(0.4, y2), z2),
      ]);

      const cable = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 18, range(rand, 0.035, 0.075), 4, false),
        this.materials.metal
      );
      this.group.add(cable);
    }
  }

  /** 近景的細節：樓層橫帶、外露鋼筋、沙土堆、倒塌的看板 */
  _fineDetails(rand) {
    // 斷牆上的樓層橫帶（讓牆有「蓋了好幾層」的尺度感）
    for (let i = 0; i < 14; i++) {
      const x = range(rand, -46, 46);
      const z = range(rand, -36, -17);
      const w = range(rand, 3.0, 9.0);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.18, 0.2),
        this.materials.charred
      );
      band.position.set(x, range(rand, 1.5, 6.5), z);
      band.rotation.y = range(rand, -0.7, 0.7);
      this.group.add(band);
    }

    // 從斷面伸出來的鋼筋
    for (let i = 0; i < 28; i++) {
      const len = range(rand, 0.5, 1.9);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, len, 4),
        this.materials.metal
      );
      bar.position.set(range(rand, -42, 42), range(rand, 0.35, 3.4), range(rand, -36, -10));
      bar.rotation.set(range(rand, -1.3, 1.3), range(rand, 0, Math.PI), range(rand, -1.3, 1.3));
      this.group.add(bar);
    }

    // 堆在牆角和路邊的沙土
    for (let i = 0; i < 22; i++) {
      const pile = new THREE.Mesh(
        new THREE.ConeGeometry(range(rand, 0.8, 2.8), range(rand, 0.18, 0.6), 7),
        this.materials.concrete
      );
      pile.position.set(range(rand, -42, 42), 0.14, range(rand, -30, -5));
      pile.scale.z = range(rand, 0.55, 0.9);
      this.group.add(pile);
    }

    // 兩座倒塌的看板骨架
    for (const [bx, bz, tilt] of [
      [-17, -23, 0.22],
      [24, -27, -0.18],
    ]) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, 3.4, 0.22),
        this.materials.metal
      );
      panel.position.set(bx, 4.2, bz);
      panel.rotation.set(0.04, tilt, tilt * 0.7);
      this.group.add(panel);

      for (const dx of [-2.8, 2.8]) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 5.6, 0.28),
          this.materials.metal
        );
        post.position.set(bx + dx, 2.6, bz + 0.14);
        this.group.add(post);
      }
    }
  }
}
