/**
 * Параметры этапов: генерация рельефа + гравитация (+ текстуры в фазе 5).
 * ВСЕ числа профиля сложности — только здесь (инвариант №5).
 */

export interface TerrainProfile {
  /** Полностью ровно до этого x (зона спавна), м. */
  flatUntilX: number;
  /** К этому x рельеф выходит на полную амплитуду профиля, м. */
  rampUntilX: number;
  /** Амплитуда: min(baseAmplitude + x * amplitudeGrowthPerM, maxAmplitude), м. */
  baseAmplitude: number;
  amplitudeGrowthPerM: number;
  maxAmplitude: number;
  /** Длина волны: от wavelengthStart (x=0) к wavelengthEnd (x >= wavelengthEndX), м. */
  wavelengthStart: number;
  wavelengthEnd: number;
  wavelengthEndX: number;
  /** Октавы value noise (2–3). */
  octaves: number;
}

export interface StageParams {
  id: string;
  title: string;
  gravityY: number;
  terrain: TerrainProfile;
}

export const COUNTRYSIDE: StageParams = {
  id: 'countryside',
  title: 'Countryside',
  gravityY: 9.8,
  terrain: {
    flatUntilX: 12,
    rampUntilX: 100,
    baseAmplitude: 0.5,
    amplitudeGrowthPerM: 1 / 400,
    maxAmplitude: 6,
    wavelengthStart: 18,
    wavelengthEnd: 9,
    wavelengthEndX: 500,
    octaves: 3,
  },
};

export const STAGES: Record<string, StageParams> = {
  countryside: COUNTRYSIDE,
};

export const DEFAULT_STAGE_ID = 'countryside';
