/** Числа игрового цикла: топливо, пикапы, условия конца заезда (инвариант №5). */

export const FUEL = {
  tankCapacity: 100,
  /** Расход в секунду во время заезда (полный бак ≈ 30 с). */
  consumptionPerSecond: 3.3,
  /** Ниже этой доли HUD мигает. */
  lowFraction: 0.25,
} as const;

export const RUN_END = {
  /** |v| ниже этого порога считается остановкой, м/с. */
  stallSpeed: 0.3,
  /** Столько секунд стоим без топлива ⇒ конец заезда. */
  stallSeconds: 3,
  /** Задержка перед экраном результатов, с. */
  deathToResultsDelay: 1.4,
  fuelToResultsDelay: 1.0,
} as const;

export const COIN_GROUPS = {
  firstX: 30,
  gapMin: 25,
  gapMax: 60,
  sizeMin: 6,
  sizeMax: 12,
  /** Шаг между монетами в группе, м. */
  spacingM: 1.15,
  /** Высота над поверхностью, м. */
  heightAboveM: 1.2,
  /** Максимальный подъём бонусной дуги в ямах/на трамплинах, м. */
  arcBoostMaxM: 1.6,
  coinValue: 1,
  /** Радиус сенсора монеты, м. */
  sensorRadiusM: 0.45,
} as const;

export const FUEL_CANS = {
  firstX: 100,
  /** Интервал между канистрами: mean ± jitter, м. */
  intervalMeanM: 120,
  intervalJitterM: 20,
  heightAboveM: 1.0,
  /** Полуразмеры сенсора канистры, м. */
  sensorHalfW: 0.35,
  sensorHalfH: 0.45,
} as const;

export const PICKUP_STREAM = {
  /** Насколько вперёд от машины планировать и спавнить, м. */
  aheadM: 90,
  /** Насколько позади удалять несобранное, м. */
  behindM: 60,
} as const;
