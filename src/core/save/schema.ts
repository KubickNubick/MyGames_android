/**
 * Схема сейва с версией и миграциями. Битые/чужие данные ⇒ дефолт,
 * частичные ⇒ нормализация полей.
 */
import { NO_UPGRADES, UPGRADES, type UpgradeLevels, UPGRADE_BRANCHES } from '../../data/upgrades';
import { DEFAULT_STAGE_ID } from '../../data/stages';

export const SAVE_VERSION = 2;

export interface VehicleSave {
  owned: boolean;
  upgrades: UpgradeLevels;
}

export interface AudioSettings {
  /** Общая громкость 0..1. */
  volume: number;
  muted: boolean;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  coins: number;
  vehicles: Record<string, VehicleSave>;
  selectedVehicle: string;
  selectedStage: string;
  bestDistance: Record<string, number>;
  settings: AudioSettings;
}

export const DEFAULT_SETTINGS: AudioSettings = { volume: 0.8, muted: false };

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    vehicles: {
      jeep: { owned: true, upgrades: { ...NO_UPGRADES } },
    },
    selectedVehicle: 'jeep',
    selectedStage: DEFAULT_STAGE_ID,
    bestDistance: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function normNumber(v: unknown, fallback: number, min = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min ? v : fallback;
}

function normUpgrades(v: unknown): UpgradeLevels {
  const out = { ...NO_UPGRADES };
  if (!isObject(v)) return out;
  for (const branch of UPGRADE_BRANCHES) {
    const level = normNumber(v[branch], 0);
    out[branch] = Math.min(UPGRADES[branch].maxLevel, Math.floor(level));
  }
  return out;
}

function normSettings(v: unknown): AudioSettings {
  if (!isObject(v)) return { ...DEFAULT_SETTINGS };
  const volume =
    typeof v.volume === 'number' && Number.isFinite(v.volume)
      ? Math.min(1, Math.max(0, v.volume))
      : DEFAULT_SETTINGS.volume;
  return { volume, muted: v.muted === true };
}

/** Нормализация данных текущей версии: недостающее — из дефолта, лишнее — отбросить. */
function normalizeCurrent(raw: Record<string, unknown>): SaveData {
  const base = defaultSave();

  const vehicles: Record<string, VehicleSave> = {};
  if (isObject(raw.vehicles)) {
    for (const [id, v] of Object.entries(raw.vehicles)) {
      if (!isObject(v)) continue;
      vehicles[id] = { owned: v.owned === true, upgrades: normUpgrades(v.upgrades) };
    }
  }
  // джип всегда есть и всегда куплен
  vehicles.jeep = { owned: true, upgrades: vehicles.jeep?.upgrades ?? { ...NO_UPGRADES } };

  const bestDistance: Record<string, number> = {};
  if (isObject(raw.bestDistance)) {
    for (const [stage, m] of Object.entries(raw.bestDistance)) {
      const value = normNumber(m, 0);
      if (value > 0) bestDistance[stage] = value;
    }
  }

  const selectedVehicle =
    typeof raw.selectedVehicle === 'string' && vehicles[raw.selectedVehicle]?.owned
      ? raw.selectedVehicle
      : base.selectedVehicle;

  return {
    version: SAVE_VERSION,
    coins: Math.floor(normNumber(raw.coins, 0)),
    vehicles,
    selectedVehicle,
    selectedStage: typeof raw.selectedStage === 'string' ? raw.selectedStage : base.selectedStage,
    bestDistance,
    settings: normSettings(raw.settings),
  };
}

/**
 * Миграция сырых данных из хранилища к текущей версии схемы.
 * Место для будущих миграций: case 1 → 2, 2 → 3 и т.д.
 */
export function migrateSave(json: string | null): SaveData {
  if (json === null) return defaultSave();

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return defaultSave(); // битый JSON
  }
  if (!isObject(raw)) return defaultSave();

  switch (raw.version) {
    case 1:
      // v1 → v2: добавились settings; normSettings подставит дефолт
      return normalizeCurrent(raw);
    case SAVE_VERSION:
      return normalizeCurrent(raw);
    default:
      // неизвестная (в т.ч. будущая) версия — безопасный дефолт
      return defaultSave();
  }
}
