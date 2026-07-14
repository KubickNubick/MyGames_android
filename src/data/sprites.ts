/**
 * Якоря и масштабы спрайтов пакета «Bumpy Buddy».
 * Значения вычислены по альфа-каналу исходников (см. docs/ASSET_VERIFICATION.md).
 * Использовать в фазе 5 (подключение текстур) — не подбирать координаты заново.
 */

/** Палитра проекта (из asset_manifest.json). */
export const PALETTE = {
  outline: 0x272a31,
  vehicleRed: 0xeb4334,
  accentOrange: 0xff8b30,
  accentYellow: 0xffcd44,
  skyBlue: 0x49a6e0,
  grassGreen: 0x68b54c,
  soilBrown: 0x94623a,
} as const;

/**
 * Кузов джипа: спрайт 512×256 px, машина смотрит вправо.
 * Принято: длина кузова 2.0 м ⇒ масштаб исходника 256 px/м.
 */
export const JEEP_BODY = {
  textureKey: 'jeep_body', // public/assets/vehicles/jeep/body.png
  spritePx: { w: 512, h: 256 },
  lengthM: 2.0,
  heightM: 1.0,
  srcPxPerM: 256,
} as const;

/**
 * Центры колёсных арок = точки крепления WheelJoint.
 * В МЕТРАХ от центра кузова, ось Y вниз (как в planck при gravity +y).
 * Вычислено по вырезам арок в body.png.
 */
export const JEEP_AXLES = {
  rear: { x: -0.471, y: 0.318 },
  front: { x: 0.525, y: 0.318 },
  /** Ширина выреза арки — визуальный «замысел» диаметра колеса по арту. */
  archDiameterM: 0.387,
} as const;

/** Колесо: спрайт 128×128 px, ось строго в центре (64, 64). */
export const JEEP_WHEEL = {
  textureKey: 'jeep_wheel', // public/assets/vehicles/jeep/wheel.png
  spritePx: 128,
} as const;
/*
 * ЗАМЕТКА ПО РАЗМЕРУ КОЛЕСА (согласовать физику и арт, выбрать один вариант):
 *  А) HCR-стиль: физический r = 0.35 м из data/vehicles.ts — колёса нарочито
 *     крупнее арок и торчат из кузова. Так выглядит оригинальный HCR, работает.
 *  Б) По арту: физический r = 0.26 м (ближе к арке r≈0.19 + резина наружу).
 *     Тогда поднять maxWheelSpeed ~ до 54 рад/с, чтобы сохранить макс. скорость
 *     (v = ω·r), и слегка поднять торк.
 */

/**
 * Голова водителя: 96×96 px. Чисто визуальный элемент на «пружинке».
 * Стартовый якорь от центра кузова (докрутить глазами в фазе 5).
 */
export const DRIVER_HEAD = {
  textureKey: 'driver_head', // public/assets/driver/head.png
  anchor: { x: -0.1, y: -0.55 },
} as const;

/** Тайлы рельефа Countryside: ground 512×512 (бесшовен X/Y), surface 512×96 (X). */
export const TERRAIN_COUNTRYSIDE = {
  ground: 'terrain_ground', // px/м подобрать: старт 128 px/м (тайл = 4×4 м)
  surface: 'terrain_surface',
  surfaceThicknessM: 0.75, // полоса травы ~96 px при 128 px/м
} as const;
