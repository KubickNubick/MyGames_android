/**
 * Апгрейды: 4 ветки как в HCR, по 10 уровней, цена base × 1.35^lvl.
 * ВСЕ числа эффектов и цен — только здесь (инвариант №5).
 * applyUpgrades — чистая функция, тестируется в Node.
 */
import type { VehicleParams } from './vehicles';

export type UpgradeBranch = 'engine' | 'suspension' | 'tires' | 'fourWheelDrive';

export const UPGRADE_BRANCHES: UpgradeBranch[] = ['engine', 'suspension', 'tires', 'fourWheelDrive'];

export interface UpgradeLevels {
  engine: number;
  suspension: number;
  tires: number;
  fourWheelDrive: number;
}

export const NO_UPGRADES: UpgradeLevels = { engine: 0, suspension: 0, tires: 0, fourWheelDrive: 0 };

export interface UpgradeBranchDef {
  id: UpgradeBranch;
  title: string;
  basePrice: number;
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeBranch, UpgradeBranchDef> = {
  engine: { id: 'engine', title: 'Мотор', basePrice: 300, maxLevel: 10 },
  suspension: { id: 'suspension', title: 'Подвеска', basePrice: 250, maxLevel: 10 },
  tires: { id: 'tires', title: 'Колёса', basePrice: 200, maxLevel: 10 },
  fourWheelDrive: { id: 'fourWheelDrive', title: '4WD', basePrice: 500, maxLevel: 10 },
};

export const PRICE_GROWTH = 1.35;

/** Целевые значения на максимальном уровне (стартовые — в data/vehicles.ts). */
export const UPGRADE_TARGETS = {
  engine: { torque: 900, maxWheelSpeed: 70 },
  suspension: { frequencyHz: 6.0, dampingRatio: 0.85 },
  tires: { friction: 3.5 },
  /** Доля торка на перед: с 1-го уровня 4WD включён, доля растёт к максимуму. */
  fourWheelDrive: { shareAtLevel1: 0.15, shareAtMax: 0.4 },
} as const;

/** Цена следующего уровня (level — текущий, 0-based): base × 1.35^level. */
export function upgradePrice(branch: UpgradeBranch, currentLevel: number): number {
  return Math.round(UPGRADES[branch].basePrice * PRICE_GROWTH ** currentLevel);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Применить уровни апгрейдов к базовым параметрам машины. Не мутирует вход. */
export function applyUpgrades(base: VehicleParams, levels: UpgradeLevels): VehicleParams {
  const tEngine = clampLevel(levels.engine, 'engine') / UPGRADES.engine.maxLevel;
  const tSusp = clampLevel(levels.suspension, 'suspension') / UPGRADES.suspension.maxLevel;
  const tTires = clampLevel(levels.tires, 'tires') / UPGRADES.tires.maxLevel;
  const lvl4wd = clampLevel(levels.fourWheelDrive, 'fourWheelDrive');
  const t4wd = lvl4wd / UPGRADES.fourWheelDrive.maxLevel;

  return {
    ...base,
    chassis: { ...base.chassis },
    axles: { rear: { ...base.axles.rear }, front: { ...base.axles.front } },
    head: { ...base.head },
    engine: {
      torque: lerp(base.engine.torque, UPGRADE_TARGETS.engine.torque, tEngine),
      maxWheelSpeed: lerp(base.engine.maxWheelSpeed, UPGRADE_TARGETS.engine.maxWheelSpeed, tEngine),
    },
    suspension: {
      frequencyHz: lerp(base.suspension.frequencyHz, UPGRADE_TARGETS.suspension.frequencyHz, tSusp),
      dampingRatio: lerp(base.suspension.dampingRatio, UPGRADE_TARGETS.suspension.dampingRatio, tSusp),
    },
    wheel: {
      ...base.wheel,
      friction: lerp(base.wheel.friction, UPGRADE_TARGETS.tires.friction, tTires),
    },
    brake: { ...base.brake },
    fourWheelDrive: lvl4wd > 0,
    frontTorqueShare:
      lvl4wd > 0
        ? lerp(UPGRADE_TARGETS.fourWheelDrive.shareAtLevel1, UPGRADE_TARGETS.fourWheelDrive.shareAtMax, t4wd)
        : base.frontTorqueShare,
  };
}

function clampLevel(level: number, branch: UpgradeBranch): number {
  return Math.max(0, Math.min(UPGRADES[branch].maxLevel, Math.floor(level)));
}
