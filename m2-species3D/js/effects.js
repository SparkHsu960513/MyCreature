import * as THREE from '../vendor/three.module.js';

/**
 * 落地漣漪池。
 * 爪尖著地時在該點生成一圈發光環，向外擴散並淡出。
 * 用固定數量的環重複利用（物件池），避免每一幀都新建幾何體。
 */
export class RipplePool {
  constructor(scene, count = 12) {
    this.items = [];
    const geo = new THREE.RingGeometry(0.92, 1.0, 48);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x35ffe0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 3;
      scene.add(mesh);
      this.items.push({ mesh, life: 1, duration: 1 });
    }
    this.cursor = 0;
  }

  spawn(pos, color = 0x35ffe0) {
    const item = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;

    item.mesh.position.set(pos.x, 0.03, pos.z);
    item.mesh.material.color.setHex(color);
    item.mesh.material.opacity = 0.7;
    item.mesh.scale.setScalar(0.35);
    item.mesh.visible = true;
    item.life = 0;
    item.duration = 0.85 + Math.random() * 0.25;
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.mesh.visible) continue;
      item.life += dt / item.duration;
      if (item.life >= 1) {
        item.mesh.visible = false;
        continue;
      }
      const t = item.life;
      const scale = 0.35 + t * 2.1;
      item.mesh.scale.setScalar(scale);
      item.mesh.material.opacity = Math.pow(1 - t, 1.6) * 0.6;
    }
  }
}

/**
 * 放電火花池。
 * 觸手著地時從腳邊炸出幾顆發光小點，往上／往外飛散再淡出。
 * 用物件池重複利用 Sprite，不會每一幀產生垃圾。
 */
export class SparkPool {
  constructor(scene, glowTexture, count = 48) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0x35ffe0,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      sprite.visible = false;
      sprite.renderOrder = 8;
      scene.add(sprite);

      this.items.push({
        sprite,
        vel: new THREE.Vector3(),
        life: 1,
        duration: 1,
        baseScale: 0.2,
      });
    }
    this.cursor = 0;
  }

  burst(pos, color = 0x35ffe0, amount = 7) {
    for (let i = 0; i < amount; i++) {
      const item = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % this.items.length;

      const a = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * 2.0;

      item.sprite.position.set(pos.x, pos.y + 0.06, pos.z);
      item.sprite.material.color.setHex(color);
      item.sprite.material.opacity = 0.95;
      item.baseScale = 0.12 + Math.random() * 0.16;
      item.sprite.scale.setScalar(item.baseScale);
      item.sprite.visible = true;

      item.vel.set(
        Math.cos(a) * spd,
        1.2 + Math.random() * 2.2,
        Math.sin(a) * spd
      );
      item.life = 0;
      item.duration = 0.4 + Math.random() * 0.35;
    }
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.sprite.visible) continue;

      item.life += dt / item.duration;
      if (item.life >= 1) {
        item.sprite.visible = false;
        continue;
      }

      item.vel.y -= 7.5 * dt;
      item.sprite.position.addScaledVector(item.vel, dt);

      const t = item.life;
      item.sprite.material.opacity = Math.pow(1 - t, 1.8);
      item.sprite.scale.setScalar(item.baseScale * (1 - t * 0.45));
    }
  }
}

/**
 * 爬行痕跡池。
 * 史萊姆爬過的地方會留下一圈淡淡的濕亮黏液，慢慢淡出。
 * 讓移動有「走過」的重量，而不是整坨飄著平移。
 */
export class TrailPool {
  constructor(scene, count = 36) {
    this.items = [];
    const geo = new THREE.CircleGeometry(1, 24);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x0f6f5c,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.006;
      mesh.visible = false;
      mesh.renderOrder = 1;
      scene.add(mesh);
      this.items.push({ mesh, life: 1, duration: 1, base: 1 });
    }
    this.cursor = 0;
  }

  spawn(x, z, yaw = 0) {
    const item = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;

    item.mesh.position.set(
      x + (Math.random() - 0.5) * 0.6,
      0.006,
      z + (Math.random() - 0.5) * 0.6
    );
    item.mesh.rotation.z = yaw + Math.random() * 0.6;
    item.base = 0.55 + Math.random() * 0.35;
    item.mesh.scale.set(item.base * 1.2, item.base * 0.8, 1);
    item.mesh.material.opacity = 0.22;
    item.mesh.visible = true;
    item.life = 0;
    item.duration = 2.0 + Math.random() * 1.2;
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.mesh.visible) continue;
      item.life += dt / item.duration;
      if (item.life >= 1) {
        item.mesh.visible = false;
        continue;
      }
      const t = item.life;
      item.mesh.material.opacity = Math.pow(1 - t, 1.5) * 0.22;
      item.mesh.scale.setScalar(item.base * (1 + t * 0.5));
    }
  }
}
