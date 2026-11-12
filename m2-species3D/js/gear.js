import * as THREE from '../vendor/three.module.js';

/**
 * 體內咬合齒輪。
 * 用 2D 齒輪輪廓（Shape）擠出成 3D 厚度，再塞進半透明的黏液軀體裡，
 * 讓史萊姆外膜底下看得到機械內臟。
 */
export class Gear {
  constructor({
    radius = 0.5,
    teeth = 8,
    thickness = 0.09,
    color = 0x94a3b8,
    spin = 1,
    emissive = 0x000000,
  } = {}) {
    this.spinSpeed = spin;
    this.mesh = new THREE.Group();

    // ── 1. 齒輪輪廓（齒根圓 / 齒頂圓交錯的梯形齒） ──────────────────────
    const shape = new THREE.Shape();
    const rOuter = radius;
    const rRoot = radius * 0.8;
    const pitch = (Math.PI * 2) / teeth;
    const pts = [];

    for (let i = 0; i < teeth; i++) {
      const a0 = i * pitch;
      pts.push([a0, rRoot]);
      pts.push([a0 + pitch * 0.16, rOuter]);
      pts.push([a0 + pitch * 0.44, rOuter]);
      pts.push([a0 + pitch * 0.6, rRoot]);
    }

    pts.forEach(([a, r], i) => {
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    // 中央軸孔
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius * 0.24, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: 0.01,
      bevelThickness: 0.01,
      bevelSegments: 1,
      curveSegments: 2,
    });
    geo.translate(0, 0, -thickness / 2);

    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.9,
      roughness: 0.32,
      emissive,
      emissiveIntensity: 0.6,
    });

    const wheel = new THREE.Mesh(geo, mat);
    this.mesh.add(wheel);

    // 貫穿齒輪的軸心
    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.19, radius * 0.19, thickness * 2.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.95, roughness: 0.4 })
    );
    axle.rotation.x = Math.PI / 2;
    this.mesh.add(axle);

    this.wheel = wheel;
  }

  update(dt, globalSpeed = 1) {
    this.wheel.rotation.z += this.spinSpeed * dt * globalSpeed;
  }
}
