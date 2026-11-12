import * as THREE from '../vendor/three.module.js';

/** 產生一張「中心亮、邊緣透明」的圓形貼圖，用來做光暈 / 柔和陰影 */
export function makeRadialTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

/**
 * 半透明黏液軀體。
 *
 * 用一顆高解析度二十面體球，在頂點著色器裡用 3D 噪波把表面揉出
 * 有機的起伏、垂墜感與行進波；片段著色器負責深墨綠膠質、霓虹青橘邊光、
 * 往下流的黏液條紋，以及兩層濕亮高光。
 *
 * 球形本身被壓得很扁、底部切平、下緣往外攤開——這是「厚重黏液」的關鍵：
 * 牠不是一顆球浮在空中，而是一坨被重力壓在地上、正在慢慢流動的膠體。
 */
export function createSlimeBody({ radius = 1.12 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uWalk: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWalk;

      varying vec3 vNormalW;
      varying vec3 vPosW;
      varying vec3 vLocal;
      varying float vDisp;

      ${NOISE_GLSL}

      float dispAt(vec3 p) {
        float t = uTime;
        float n1 = noise(p * 1.45 + vec3(0.0, t * 0.30, t * 0.16));
        float n2 = noise(p * 3.20 + vec3(t * 0.20, -t * 0.25, 0.0));
        float n3 = noise(p * 6.60 + vec3(t * 0.33, 0.0, -t * 0.28));
        float breathe = sin(t * 1.35) * 0.5 + 0.5;
        float wave = sin(p.x * 3.2 - t * 4.6 + p.z * 2.4);
        // 越靠底部，「垂墜」的幅度越大：像濃稠的膠往下沉
        float sag = smoothstep(0.35, -0.75, p.y) * (0.5 + 0.5 * sin(t * 0.62 + p.x * 1.1));
        return (n1 - 0.5) * 0.28
             + (n2 - 0.5) * 0.10
             + (n3 - 0.5) * 0.030
             + wave * (0.008 + uWalk * 0.024)
             + breathe * 0.018
             + sag * 0.060;
      }

      void main() {
        vec3 p = position;
        float d = dispAt(p);

        vec3 np = p * (1.0 + d);

        // 厚重感：高度只剩約 0.6，底部整片切平，
        // 下緣像濃稠的芡汁一樣往外攤開——輪廓要是「一灘」而不是「一顆球」
        np.y = max(np.y * 0.60, -0.52) * 1.02;

        float bulge = smoothstep(0.30, -0.65, np.y);
        float spread = 1.0 + bulge * 0.62;
        np.x *= spread;
        np.z *= spread * 1.05;
        np.z += bulge * 0.06;

        // 用相鄰取樣近似位移後的法線，讓凹凸真的有光影
        vec3 tangent = cross(normal, vec3(0.0, 1.0, 0.0));
        if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);
        tangent = normalize(tangent);
        vec3 bitan = normalize(cross(normal, tangent));

        float e = 0.06;
        float dt = dispAt(p + tangent * e) - dispAt(p - tangent * e);
        float db = dispAt(p + bitan * e) - dispAt(p - bitan * e);
        vec3 nDisp = normalize(normal - (tangent * dt + bitan * db) * 2.0);

        vec4 wp = modelMatrix * vec4(np, 1.0);
        vPosW = wp.xyz;
        vLocal = np;
        vNormalW = normalize(mat3(modelMatrix) * nDisp);
        vDisp = d;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uWalk;

      varying vec3 vNormalW;
      varying vec3 vPosW;
      varying vec3 vLocal;
      varying float vDisp;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vPosW);

        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);

        // 陽光來自左後上方（畫面的左上），另一側補冷色輪廓光
        vec3 sunDir = normalize(vec3(-0.50, 0.62, -0.42));
        vec3 rimDir = normalize(vec3(0.62, 0.28, 0.74));
        float sun = clamp(dot(N, sunDir), 0.0, 1.0);
        float rim = clamp(dot(N, rimDir), 0.0, 1.0);

        vec3 amber = vec3(1.0, 0.45, 0.10);
        vec3 cyan = vec3(0.10, 1.0, 0.84);

        // 青 / 橘色沿著身體緩慢流動
        float tint = 0.5 + 0.5 * sin(uTime * 0.55 + vPosW.x * 1.1 + vPosW.z * 0.85);
        vec3 edge = mix(cyan, amber, tint * 0.66);

        // 深墨綠的膠質本體：凹凸的地方顏色深淺不同
        vec3 deepGel = vec3(0.007, 0.036, 0.030);
        vec3 bodyGel = vec3(0.030, 0.150, 0.112);
        vec3 col = mix(deepGel, bodyGel, smoothstep(-0.22, 0.22, vDisp));

        // 內部透光：下半部較薄，被體內的暖色腺體從裡面照出來
        float inner = smoothstep(0.55, -0.80, vLocal.y);
        col += vec3(0.20, 0.095, 0.028) * inner * 0.65;

        col += edge * fres * 1.45;
        col += amber * sun * 0.10;
        col += cyan * rim * 0.10;

        // 濕亮：一層寬的油光 + 一層很尖的鏡面反光
        vec3 H = normalize(sunDir + V);
        float gloss = pow(max(dot(N, H), 0.0), 16.0);
        float spec = pow(max(dot(N, H), 0.0), 130.0);
        col += vec3(0.95, 0.80, 0.55) * gloss * 0.16;
        col += vec3(0.80, 1.0, 0.96) * spec * 1.15;

        // 順著身體往下流的黏液條紋（濕亮的縱向反光）
        float ang = atan(vLocal.z, vLocal.x);
        float stripe = 0.5 + 0.5 * sin(ang * 10.0 + sin(vLocal.y * 2.6 + uTime * 0.32) * 2.2);
        float streak = pow(stripe, 4.0) * smoothstep(0.55, -0.35, vLocal.y);
        col += vec3(0.10, 0.50, 0.42) * streak * 0.20;

        // 披肩般的行進波亮帶
        float band = smoothstep(0.70, 1.0, sin(vLocal.z * 4.2 + vLocal.y * 2.0 - uTime * 5.0) * 0.5 + 0.5);
        col += edge * band * (0.05 + uWalk * 0.10);

        float alpha = 0.72 + fres * 0.24;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), material);
  mesh.scale.setScalar(radius);
  mesh.renderOrder = 5;

  return { mesh, uniforms };
}

/**
 * 軀體底下的黏液灘。
 *
 * 一片貼地的圓盤，用著色器做出不規則邊緣、濕亮的青色邊光、
 * 緩慢旋轉的濃稠漩渦，還有幾顆浮在表面的氣泡。
 * 讓生物看起來真的「黏」在地面上，而不是浮在空中。
 */
export function createSlimePool({ radius = 3.2 } = {}) {
  const uniforms = { uTime: { value: 0 } };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPosW;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPosW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vPosW;

      ${NOISE_GLSL}

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x);

        // 不規則、會蠕動的邊緣
        float wob = sin(ang * 5.0 + uTime * 1.1) * 0.055
                  + sin(ang * 9.0 - uTime * 0.8) * 0.03
                  + (noise(vec3(p * 3.0, uTime * 0.22)) - 0.5) * 0.10;

        float rr = r + wob;
        float body = 1.0 - smoothstep(0.42, 0.94, rr);
        float rim = smoothstep(0.72, 0.90, rr) * (1.0 - smoothstep(0.90, 1.02, rr));

        // 濃稠的漩渦：沿著半徑慢慢轉
        float swirl = 0.5 + 0.5 * sin(ang * 7.0 - r * 9.0 + uTime * 0.6);
        float swirl2 = 0.5 + 0.5 * sin(ang * 13.0 + r * 15.0 - uTime * 0.9);

        // 表面浮著的氣泡：亮亮的小圓點
        float bubbleN = noise(vec3(p * 5.5, uTime * 0.10));
        float bubble = smoothstep(0.74, 0.92, bubbleN) * body;

        vec3 col = mix(vec3(0.008, 0.034, 0.030), vec3(0.020, 0.300, 0.250), rim * 0.85);
        col += vec3(0.055, 0.150, 0.125) * (swirl * 0.55 + swirl2 * 0.25) * body;
        col += vec3(0.10, 0.62, 0.55) * bubble * 0.55;

        float alpha = body * (0.66 + bubble * 0.26) + rim * 0.30;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 80), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  mesh.renderOrder = 2;
  return { mesh, uniforms };
}

/**
 * 軀體下緣的膠質裙擺（slime skirt）。
 *
 * 一層從軀體垂到地面的半透明膜，會呼吸、波動，底部還有一瓣一瓣
 * 像快滴下來的黏液。它把球體和地上的黏液灘接在一起，
 * 看起來像「一坨黏在地上」而不是浮著。
 */
export function createSlimeSkirt({ topRadius = 0.82, bottomRadius = 2.05, height = 1.15 } = {}) {
  const uniforms = { uTime: { value: 0 } };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying float vT;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vLocal;

      void main() {
        vec3 p = position;
        float t = p.y / ${height.toFixed(2)} + 0.5;   // 0 = 底部、1 = 頂端
        float ang = atan(p.z, p.x);

        // 越靠近地面，波動越大：底部像濃稠液體一樣一瓣一瓣垂下來
        float lobe = sin(ang * 6.0 + uTime * 0.85) * 0.5 + sin(ang * 11.0 - uTime * 1.15) * 0.5;
        float wob = sin(ang * 7.0 + uTime * 1.15) * (0.05 + 0.06 * (1.0 - t))
                  + sin(ang * 13.0 - uTime * 0.85) * 0.03;

        p.xz *= 1.0 + wob * (1.0 - t * 0.55);
        p.y += sin(ang * 5.0 + uTime * 1.6) * 0.035 * (1.0 - t);
        p.y -= pow(max(lobe, 0.0), 2.0) * 0.13 * (1.0 - t);
        p.xz *= 1.0 + sin(t * 5.0 - uTime * 1.7) * 0.02;

        vec4 wp = modelMatrix * vec4(p, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vT = t;
        vLocal = p;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying float vT;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vLocal;

      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0);

        // 縱向的黏液絲：把裙擺切成一條一條往下流的膠
        float ang = atan(vLocal.z, vLocal.x);
        float strandN = 0.5 + 0.5 * sin(ang * 17.0 + sin(vLocal.y * 2.4 - uTime * 0.5) * 1.6);
        float strand = 0.55 + strandN * 0.5;

        float streak = 0.5 + 0.5 * sin(vT * 14.0 + vLocal.x * 3.0 + uTime * 0.7);
        vec3 base = mix(vec3(0.012, 0.046, 0.040), vec3(0.045, 0.135, 0.110), streak * 0.75);

        float rim = smoothstep(0.30, 0.0, vT);
        vec3 cyan = vec3(0.10, 0.85, 0.70);
        vec3 amber = vec3(0.95, 0.42, 0.10);
        vec3 rimCol = mix(cyan, amber, 0.35 + 0.35 * sin(uTime * 0.6));

        // 被陽光從左後方擦亮的濕邊
        vec3 sunDir = normalize(vec3(-0.50, 0.62, -0.42));
        float sunSide = clamp(dot(normalize(vec3(cos(ang), 0.25, sin(ang))), sunDir), 0.0, 1.0);

        vec3 col = base + cyan * fres * 0.55 + rimCol * rim * 0.60;
        col += vec3(0.45, 0.30, 0.14) * sunSide * 0.16;

        float alpha = (0.32 + vT * 0.30 + fres * 0.22 + rim * 0.14) * strand;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(topRadius, bottomRadius, height, 72, 12, true),
    material
  );
  mesh.renderOrder = 3;
  return { mesh, uniforms };
}
