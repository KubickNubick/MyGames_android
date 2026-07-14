/**
 * Seedable шум без зависимостей: mulberry32 PRNG + 1D value noise (fBm).
 * Чистый модуль, детерминизм: одинаковый seed ⇒ одинаковые значения (инвариант №4).
 */

/** Классический mulberry32: быстрый seedable PRNG, [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Детерминированный хэш целочисленного узла решётки → [0, 1). Без таблиц — O(1) память. */
function latticeHash(i: number, seed: number): number {
  let t = (Math.imul(i, 0x9e3779b1) ^ seed) | 0;
  t = (t + 0x6d2b79f5) | 0;
  let x = Math.imul(t ^ (t >>> 15), 1 | t);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

/** Квинтик-сглаживание (C2-непрерывность — без изломов производной на узлах). */
function smootherstep(f: number): number {
  return f * f * f * (f * (f * 6 - 15) + 10);
}

/** 1D value noise: гладкая интерполяция случайных значений на целых узлах, [-1, 1]. */
export function createValueNoise1D(seed: number): (u: number) => number {
  return (u: number) => {
    const i0 = Math.floor(u);
    const f = u - i0;
    const v0 = latticeHash(i0, seed);
    const v1 = latticeHash(i0 + 1, seed);
    const v = v0 + (v1 - v0) * smootherstep(f);
    return v * 2 - 1;
  };
}

/** fBm: сумма октав value noise, частота ×2, амплитуда ×0.5. Результат в [-1, 1]. */
export function createFbm1D(seed: number, octaves: number): (u: number) => number {
  const layers: Array<(u: number) => number> = [];
  for (let i = 0; i < octaves; i++) {
    // свой seed на октаву, чтобы узлы не совпадали
    layers.push(createValueNoise1D((seed ^ Math.imul(i + 1, 0x85ebca6b)) | 0));
  }
  let norm = 0;
  for (let i = 0; i < octaves; i++) norm += 0.5 ** i;
  return (u: number) => {
    let sum = 0;
    let freq = 1;
    let amp = 1;
    for (const layer of layers) {
      sum += layer(u * freq) * amp;
      freq *= 2;
      amp *= 0.5;
    }
    return sum / norm;
  };
}
