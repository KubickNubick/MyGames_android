/**
 * Генератор высоты рельефа y(x) с профилем сложности.
 * Чистая функция: одинаковый seed + профиль ⇒ одинаковый рельеф в любой точке,
 * независимо от порядка запросов (инвариант №4).
 *
 * Ось Y вниз: холмы — отрицательные y, базовый уровень 0.
 */
import type { TerrainProfile } from '../../data/stages';
import { createFbm1D } from './noise';

export type HeightFn = (x: number) => number;

function smoothstep01(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export function createHeightFn(seed: number, profile: TerrainProfile): HeightFn {
  const fbm = createFbm1D(seed | 0, profile.octaves);

  const { wavelengthStart: l0, wavelengthEnd: l1, wavelengthEndX: X } = profile;
  const k = (l1 - l0) / X; // скорость изменения длины волны

  /**
   * Фаза шума u(x) = ∫ dx/λ(x) — закрытая форма.
   * Наивное u = x/λ(x) при переменной λ даёт «чирп»: реальная частота
   * летит вдвое выше целевой к концу разгона профиля.
   */
  function phase(x: number): number {
    const ax = Math.abs(x); // симметрично для x < 0 (езда назад от спавна)
    let u: number;
    if (k === 0) {
      u = ax / l0;
    } else if (ax < X) {
      u = Math.log(1 + (k * ax) / l0) / k;
    } else {
      u = Math.log(l1 / l0) / k + (ax - X) / l1;
    }
    return x < 0 ? -u : u;
  }

  function amplitude(x: number): number {
    const ax = Math.abs(x);
    const profileAmp = Math.min(
      profile.baseAmplitude + ax * profile.amplitudeGrowthPerM,
      profile.maxAmplitude,
    );
    // Зона спавна ровная, затем плавный ввод рельефа к rampUntilX.
    const ramp = smoothstep01((ax - profile.flatUntilX) / (profile.rampUntilX - profile.flatUntilX));
    return profileAmp * ramp;
  }

  return (x: number) => -amplitude(x) * fbm(phase(x));
}
