/**
 * 固定種子的亂數產生器。
 *
 * 為什麼不用 Math.random？因為背景的廢墟、碎石、鋼筋每次重新整理都應該長在
 * 同樣的位置。畫面每次都不一樣會讓人覺得「場景在閃」，而且很難微調構圖。
 * 這個寫法是 mulberry32：同一個種子永遠產生同一串 0~1 的數字。
 */
export function makeRandom(seed = 1) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 在 [min, max] 之間取值 */
export function range(random, min, max) {
  return min + random() * (max - min);
}
