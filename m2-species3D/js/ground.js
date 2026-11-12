import * as THREE from '../vendor/three.module.js';

/**
 * 廢土觀測場地平面。
 *
 * 這是整個 3D 空間感的地基。著色器裡疊了這些東西：
 *   1. 被曬乾的淺灰水泥地 + 砂土色斑
 *   2. 細碎砂礫與龜裂的縫
 *   3. 一塊塊滲進地面的濕亮油漬
 *   4. 極淡的舊網格（透視收斂的依據）
 *   5. 遠處一層暖色沙塵，讓地平線和天空接得起來
 *   6. 左後方被太陽照亮的大片暖光與拉長的亮帶
 *
 * 網格只有若隱若現，因為這裡是被棄置的觀測場，不是乾淨的實驗室。
 */
export function createGround({ size = 200 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uFogColor: { value: new THREE.Color(0.34, 0.30, 0.245) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: true,
    vertexShader: /* glsl */ `
      varying vec3 vPosW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPosW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uFogColor;
      varying vec3 vPosW;

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
        vec2 p = vPosW.xz;
        float dist = length(p);

        // ── 被曬乾的水泥地 + 大尺度髒污 ─────────────────────────────
        float n = noise(p * 0.28) * 0.55
                + noise(p * 1.15) * 0.28
                + noise(p * 4.2) * 0.12
                + noise(p * 11.0) * 0.05;
        vec3 col = vec3(0.180, 0.166, 0.142) + n * 0.058;

        // 風吹來的砂土，堆成一片片比較暖的色斑
        float sand = smoothstep(0.42, 0.86, noise(p * 0.21 + 9.0));
        col = mix(col, vec3(0.285, 0.236, 0.172), sand * 0.52);

        // 細碎砂礫：一顆一顆被曬白的小石頭
        float grit = smoothstep(0.72, 0.94, noise(p * 9.0 + 13.0));
        col *= 1.0 - grit * 0.18;
        col += vec3(0.10, 0.095, 0.085) * smoothstep(0.9, 0.99, noise(p * 26.0)) * 0.5;

        // 龜裂的縫：只在某些區塊出現，細細的深色線
        float crackField = noise(p * 0.14 + 7.0);
        float crackLine = smoothstep(0.030, 0.0, abs(noise(p * 0.62 + 3.0) - 0.5));
        col *= 1.0 - crackLine * smoothstep(0.5, 0.8, crackField) * 0.30;

        // ── 滲進地面的濕亮油漬，慢慢漂 ──────────────────────────────
        float sheen = smoothstep(0.56, 0.92, noise(p * 0.16 + vec2(uTime * 0.010, -uTime * 0.007)));
        col += vec3(0.045, 0.075, 0.065) * sheen;

        // ── 舊網格：只在近中景若隱若現 ─────────────────────────────
        vec2 gridUV = abs(fract(p * 0.25) - 0.5);
        float line = min(gridUV.x, gridUV.y);
        float grid = smoothstep(0.013, 0.0, line);
        float gridFade = smoothstep(38.0, 7.0, dist) * smoothstep(4.0, 16.0, dist);
        float gridBreak = smoothstep(0.25, 0.62, noise(p * 0.9 + 5.0));
        col += vec3(0.085, 0.140, 0.135) * grid * gridFade * gridBreak * 0.7;

        // ── 中央暖色光池：把生物圈在視線中心 ───────────────────────
        col += vec3(0.150, 0.100, 0.045) * smoothstep(15.0, 2.5, dist) * 0.95;

        // ── 遠處沙塵：把地平線接回天空的暖灰 ───────────────────────
        float dustNoise = noise(p * 0.075 + vec2(uTime * 0.004, 0.0));
        float haze = smoothstep(16.0, 68.0, dist);
        col = mix(col, uFogColor * (0.82 + dustNoise * 0.35), haze * 0.92);

        // ── 左後方的陽光：把整片遠景染暖 ───────────────────────────
        vec2 sunFlat = normalize(vec2(-0.68, -0.74));
        float facingSun = max(dot(normalize(p + vec2(0.001)), sunFlat), 0.0);
        float sunPool = pow(facingSun, 4.0) * smoothstep(10.0, 58.0, dist);
        col += vec3(0.62, 0.42, 0.20) * sunPool * 1.15;

        // 地面上被陽光拉長的亮帶
        float streak = smoothstep(0.55, 1.0, noise(p * vec2(0.10, 0.42) + vec2(-uTime * 0.008, 0.0)));
        col += vec3(0.14, 0.10, 0.055) * streak * sunPool * 0.8;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  return { mesh, uniforms };
}
