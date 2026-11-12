import * as THREE from '../vendor/three.module.js';
import { makeRandom, range } from './random.js';

/**
 * 從左上方斜射進來的晨光光束（天使光）。
 *
 * 做法：把幾個「上窄下寬」的圓錐沿著光的方向擺好，材質是加色的半透明著色器。
 * 所有光束都從畫面左上角那顆太陽出發，往場景裡不同的方向射，
 * 所以會自然形成一個放射狀的光扇；著色器讓光束中段比邊緣亮、頭尾淡出，
 * 再加一點緩慢飄動的雜訊，看起來就像光穿過厚厚灰塵時被散射開來。
 *
 * 這些光束只是視覺效果，不參與照明；真正的陽光在 main.js 的 keyLight。
 */
export class SunShafts {
  constructor({ count = 9, color = 0xffe0b0, sunPosition } = {}) {
    this.group = new THREE.Group();
    this.sunPosition = (sunPosition ?? new THREE.Vector3(-46, 7.5, -62)).clone();

    const rand = makeRandom(76231);
    const up = new THREE.Vector3(0, 1, 0);

    this.beams = [];
    for (let i = 0; i < count; i++) {
      const uniforms = {
        uTime: { value: 0 },
        uSeed: { value: rand() * 20 },
        uOpacity: { value: range(rand, 0.07, 0.19) },
        uColor: { value: new THREE.Color(color) },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vUv = uv;
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vW = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uSeed;
          uniform float uOpacity;
          uniform vec3 uColor;

          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vW;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          void main() {
            vec3 N = normalize(vN);
            vec3 V = normalize(cameraPosition - vW);

            // 面向鏡頭的部分最亮，邊緣柔和地消失
            float facing = pow(abs(dot(N, V)), 1.15);

            // 頭尾淡出（vUv.y：0 = 光束底端、1 = 頂端）
            float ends = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.55, vUv.y);

            // 順著光束方向的絲狀雜訊，慢慢飄
            float streak = noise(vec2(vUv.x * 7.0 + uSeed * 13.0, vUv.y * 2.6 - uTime * 0.045));
            streak = 0.42 + streak * 0.85;

            // 細碎的灰塵顆粒感
            float grit = noise(vec2(vUv.x * 26.0 - uTime * 0.02, vUv.y * 11.0 + uSeed * 7.0));

            float alpha = uOpacity * facing * ends * streak * (0.65 + grit * 0.6);
            // 光束中心再補一條比較亮的核心，讓光有「穿透」的感覺
            alpha += uOpacity * pow(facing, 5.0) * ends * 0.5;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });

      // 以太陽為起點，射向場景裡某個目標點：自然形成扇形
      const target = new THREE.Vector3(
        range(rand, -26, 28),
        range(rand, -1, 3),
        range(rand, -44, 6)
      );
      const dir = target.sub(this.sunPosition).normalize();

      const length = range(rand, 70, 115);
      const radius = range(rand, 3.2, 8.5);
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), material);
      mesh.scale.set(radius, length, radius);
      mesh.position.y = -length / 2;
      mesh.renderOrder = 1;

      const holder = new THREE.Group();
      holder.position.copy(this.sunPosition).addScaledVector(dir, range(rand, 4, 10));
      holder.quaternion.setFromUnitVectors(up, dir.clone().negate());
      holder.add(mesh);
      this.group.add(holder);

      this.beams.push({
        mesh,
        uniforms,
        baseOpacity: uniforms.uOpacity.value,
        phase: rand() * 8,
      });
    }

    // 太陽本體：一顆很小但很亮的核心
    this.sunCore = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xfff4dc,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        fog: false,
      })
    );
    this.sunCore.position.copy(this.sunPosition);
    this.sunCore.scale.setScalar(11);
    this.sunCore.renderOrder = 1;
    this.group.add(this.sunCore);

    // 外圈：把太陽糊開一大片暖霧
    this.sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xffd9a0,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        fog: false,
      })
    );
    this.sunGlow.position.copy(this.sunPosition);
    this.sunGlow.scale.setScalar(64);
    this.sunGlow.renderOrder = 1;
    this.group.add(this.sunGlow);

    this._sunGlowBase = 0.55;
  }

  setTexture(texture) {
    this.sunCore.material.map = texture;
    this.sunCore.material.needsUpdate = true;
    this.sunGlow.material.map = texture;
    this.sunGlow.material.needsUpdate = true;
  }

  update(time) {
    for (const beam of this.beams) {
      beam.uniforms.uTime.value = time;
      // 非常緩慢的明暗呼吸，像灰塵濃度在變
      const breathe = 0.86 + 0.14 * Math.sin(time * 0.23 + beam.phase);
      beam.uniforms.uOpacity.value = beam.baseOpacity * breathe;
    }
    this.sunGlow.material.opacity = this._sunGlowBase * (0.92 + 0.08 * Math.sin(time * 0.31));
  }
}

/**
 * 空氣中的灰塵。
 *
 * 用 Points 畫幾百顆發亮的小點，讓它們極慢地往右上方飄、飄出範圍就繞回來。
 * 有這些點，光束和閃電才不會像貼在背景上的貼紙，而是「有空氣」。
 */
export class Dust {
  constructor({ count = 900, texture } = {}) {
    const rand = makeRandom(51423);
    const positions = new Float32Array(count * 3);
    this.speeds = new Float32Array(count);
    this.phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 三分之一集中在左上方的光束裡，讓光「照出」空氣中的塵埃
      if (rand() < 0.34) {
        positions[i * 3 + 0] = range(rand, -28, -1);
        positions[i * 3 + 1] = range(rand, 2.0, 14);
        positions[i * 3 + 2] = range(rand, -36, -11);
      } else {
        positions[i * 3 + 0] = range(rand, -42, 38);
        positions[i * 3 + 1] = range(rand, 0.2, 15);
        positions[i * 3 + 2] = range(rand, -52, 7);
      }
      this.speeds[i] = range(rand, 0.05, 0.30);
      this.phases[i] = rand() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      map: texture ?? null,
      color: 0xfff0d8,
      size: 0.13,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.count = count;
    this.positions = positions;
  }

  update(dt, time) {
    const p = this.positions;
    const posAttr = this.points.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      p[i3 + 0] += this.speeds[i] * dt;
      p[i3 + 1] += Math.sin(time * 0.5 + this.phases[i]) * 0.03 * dt;
      p[i3 + 2] += this.speeds[i] * 0.25 * dt;

      if (p[i3 + 0] > 38) p[i3 + 0] = -42;
      if (p[i3 + 2] > 7) p[i3 + 2] = -52;
      if (p[i3 + 1] < 0.2) p[i3 + 1] = 15;
    }

    posAttr.needsUpdate = true;
  }
}
