/**
 * Глобальные константы игры. Числа физики/баланса живут в src/data/*.ts,
 * здесь — только конфигурация рендера и отладки.
 */

/** Конверсия метры → пиксели. Используется ТОЛЬКО в src/render/. */
export const PX_PER_M = 50;

/** Базовое разрешение канваса. */
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

/**
 * Масштаб внутреннего разрешения для слабых устройств: ?res=0.75 (0.5–1).
 * Камера компенсирует зумом — мир виден одинаково при любом res.
 */
function resScale(): number {
  if (typeof window === 'undefined') return 1;
  const raw = new URLSearchParams(window.location.search).get('res');
  const value = raw !== null ? Number(raw) : 1;
  return Number.isFinite(value) ? Math.min(1, Math.max(0.5, value)) : 1;
}

export const RES_SCALE = resScale();
export const GAME_WIDTH = Math.round(BASE_WIDTH * RES_SCALE);
export const GAME_HEIGHT = Math.round(BASE_HEIGHT * RES_SCALE);

/** URL-параметры отладки: ?seed=42&stage=countryside&auto=gas&debug=1&x=500 */
export interface DebugParams {
  seed: number | null;
  stage: string | null;
  autoGas: boolean;
  debugDraw: boolean;
  /** Стартовый x спавна, м (телепорт на сложный участок для отладки). */
  spawnX: number;
  /** Стартовая сцена: menu (по умолчанию), game или garage. */
  scene: 'menu' | 'game' | 'garage';
}

function numberParam(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name);
  if (raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function parseDebugParams(search: string): DebugParams {
  const params = new URLSearchParams(search);
  return {
    seed: numberParam(params, 'seed'),
    stage: params.get('stage'),
    autoGas: params.get('auto') === 'gas',
    debugDraw: params.get('debug') === '1',
    spawnX: numberParam(params, 'x') ?? 0,
    scene: sceneParam(params.get('scene')),
  };
}

function sceneParam(raw: string | null): 'menu' | 'game' | 'garage' {
  return raw === 'garage' || raw === 'game' ? raw : 'menu';
}
