/**
 * Глобальные константы игры. Числа физики/баланса живут в src/data/*.ts,
 * здесь — только конфигурация рендера и отладки.
 */

/** Конверсия метры → пиксели. Используется ТОЛЬКО в src/render/. */
export const PX_PER_M = 50;

/** Размер игрового канваса. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** URL-параметры отладки: ?seed=42&stage=countryside&auto=gas&debug=1&x=500 */
export interface DebugParams {
  seed: number | null;
  stage: string | null;
  autoGas: boolean;
  debugDraw: boolean;
  /** Стартовый x спавна, м (телепорт на сложный участок для отладки). */
  spawnX: number;
  /** Стартовая сцена: game (по умолчанию) или garage. */
  scene: 'game' | 'garage';
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
    scene: params.get('scene') === 'garage' ? 'garage' : 'game',
  };
}
