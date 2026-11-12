import * as THREE from '../vendor/three.module.js';

/**
 * 廢土天空。
 *
 * 用一顆很大的球（從內側看）當作天空，著色器裡做三件事：
 *   1. 由地平線的暖灰塵色往上漸變到頭頂的冷暗藍綠。
 *   2. 在低空加一層被風吹動的厚灰塵帶。
 *   3. 左後上方放一顆被塵埃糊開的太陽，讓整個左上是暖的。
 *
 * 天空球半徑很大而且不寫入深度，所以它永遠在最遠處，不會擋住任何東西。
 */
export class Sky {
  constructor({ sunDirection = new THREE.Vector3(-0.62, 0.16, -0.77) } = {}) {
    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: sunDirection.clone().normalize() },
      uHorizon: { value: new THREE.Color(0.52, 0.44, 0.33) },
      uZenith: { value: new THREE.Color(0.13, 0.21, 0.32) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uHorizon;
        uniform vec3 uZenith;
        varying vec3 vDir;

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
          vec3 d = normalize(vDir);
          float h = d.y;

          // 地平線暖塵 → 天頂冷暗
          vec3 col = mix(uHorizon, uZenith, smoothstep(-0.03, 0.52, h));

          // 低空的厚灰塵帶：像沙塵貼在地平線上被風慢慢推
          float ang = atan(d.z, d.x);
          float band = noise(vec2(ang * 2.6 + uTime * 0.006, h * 11.0 - uTime * 0.004));
          float bandMask = smoothstep(-0.06, 0.02, h) * (1.0 - smoothstep(0.02, 0.30, h));
          col += uHorizon * band * bandMask * 0.85;

          // 清晨薄薄的雲帶
          float cloud = smoothstep(0.48, 0.80, noise(vec2(ang * 3.2 + uTime * 0.004, h * 7.0 - uTime * 0.003)));
          cloud *= smoothstep(0.0, 0.10, h) * (1.0 - smoothstep(0.10, 0.30, h));
          col += vec3(0.95, 0.86, 0.72) * cloud * 0.30;

          // 太陽：明亮但邊緣糊開的晨光，外圈拉出一大片暖霧
          float sun = max(dot(d, normalize(uSunDir)), 0.0);
          col += vec3(1.0, 0.88, 0.68) * pow(sun, 320.0) * 5.5;
          col += vec3(1.0, 0.80, 0.52) * pow(sun, 12.0) * 0.85;
          col += vec3(0.86, 0.64, 0.40) * pow(sun, 2.8) * 0.34;

          // 頭頂再壓暗一點，讓視線留在中央的生物身上
          col *= 1.0 - smoothstep(0.40, 1.0, h) * 0.28;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 24), material);
    this.mesh.renderOrder = -10;
  }

  update(time) {
    this.uniforms.uTime.value = time;
  }
}
