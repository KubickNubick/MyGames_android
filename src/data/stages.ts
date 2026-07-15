/**
 * Параметры этапов: генерация рельефа + гравитация + визуал (текстуры/палитра).
 * ВСЕ числа профиля сложности — только здесь (инвариант №5).
 *
 * Готовые текстуры есть только у Countryside; остальные этапы используют
 * тот же набор с тонировкой (плейсхолдер по правилу «не блокироваться»).
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

export interface StageVisuals {
  /** Папки наборов текстур: bg/<bgSet>/, terrain/<terrainSet>/. */
  bgSet: string;
  terrainSet: string;
  /** Рисовать sky.png (иначе — заливка backgroundColor). */
  useSkyTexture: boolean;
  backgroundColor: number;
  /** tintFill силуэтов холмов; null = оригинальные цвета текстуры. */
  hillsFarColor: number | null;
  hillsNearColor: number | null;
  cloudsVisible: boolean;
  /** Мультипликативная тонировка грунта (0xffffff = как есть). */
  groundTint: number;
  /** Полоса поверхности: [основной цвет, кромка]. */
  surfaceBand: [number, number];
}

export interface StageParams {
  id: string;
  title: string;
  gravityY: number;
  terrain: TerrainProfile;
  visuals: StageVisuals;
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
  visuals: {
    bgSet: 'countryside',
    terrainSet: 'countryside',
    useSkyTexture: true,
    backgroundColor: 0x49a6e0,
    hillsFarColor: null,
    hillsNearColor: null,
    cloudsVisible: true,
    groundTint: 0xffffff,
    surfaceBand: [0x68b54c, 0x4e9138],
  },
};

export const DESERT: StageParams = {
  id: 'desert',
  title: 'Desert',
  gravityY: 9.8,
  terrain: {
    flatUntilX: 12,
    rampUntilX: 110,
    baseAmplitude: 0.6,
    amplitudeGrowthPerM: 1 / 380,
    maxAmplitude: 5.5,
    wavelengthStart: 24, // пологие дюны
    wavelengthEnd: 12,
    wavelengthEndX: 550,
    octaves: 2,
  },
  visuals: {
    bgSet: 'countryside',
    terrainSet: 'countryside',
    useSkyTexture: false,
    backgroundColor: 0xf7c873,
    hillsFarColor: 0xd99a4e,
    hillsNearColor: 0xc07f35,
    cloudsVisible: true,
    groundTint: 0xf0c070, // песок
    surfaceBand: [0xf6d488, 0xd9a45f],
  },
};

export const MOON: StageParams = {
  id: 'moon',
  title: 'Moon',
  gravityY: 1.62, // отдельный кайф
  terrain: {
    flatUntilX: 12,
    rampUntilX: 90,
    baseAmplitude: 0.5,
    amplitudeGrowthPerM: 1 / 350,
    maxAmplitude: 7,
    wavelengthStart: 16,
    wavelengthEnd: 9,
    wavelengthEndX: 450,
    octaves: 3,
  },
  visuals: {
    bgSet: 'countryside',
    terrainSet: 'countryside',
    useSkyTexture: false,
    backgroundColor: 0x0b0e1a,
    hillsFarColor: 0x2a2f3f,
    hillsNearColor: 0x3c4254,
    cloudsVisible: false,
    groundTint: 0x9aa0ad, // серый реголит
    surfaceBand: [0xbfc5d2, 0x7e8494],
  },
};

export const CAVE: StageParams = {
  id: 'cave',
  title: 'Cave',
  gravityY: 9.8,
  terrain: {
    flatUntilX: 10,
    rampUntilX: 80,
    baseAmplitude: 0.6,
    amplitudeGrowthPerM: 1 / 300,
    maxAmplitude: 4.5,
    wavelengthStart: 13, // рваный профиль
    wavelengthEnd: 7,
    wavelengthEndX: 400,
    octaves: 3,
  },
  visuals: {
    bgSet: 'countryside',
    terrainSet: 'countryside',
    useSkyTexture: false,
    backgroundColor: 0x171015,
    hillsFarColor: 0x241a20,
    hillsNearColor: 0x33252c,
    cloudsVisible: false,
    groundTint: 0x8a6a52, // тёмная порода
    surfaceBand: [0x6f5342, 0x4c382d],
  },
};

export const STAGES: Record<string, StageParams> = {
  countryside: COUNTRYSIDE,
  desert: DESERT,
  moon: MOON,
  cave: CAVE,
};

export const STAGE_IDS = Object.keys(STAGES);

export const DEFAULT_STAGE_ID = 'countryside';
