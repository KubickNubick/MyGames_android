/**
 * Глобальные константы игры. Числа физики/баланса живут в src/data/*.ts,
 * здесь — только конфигурация рендера и отладки.
 */

/** Конверсия метры → пиксели. Используется ТОЛЬКО в src/render/. */
export const PX_PER_M = 50;

/** Размер игрового канваса. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** URL-параметры отладки: ?seed=42&stage=countryside&auto=gas&debug=1 */
export interface DebugParams {
  seed: number | null;
  stage: string | null;
  autoGas: boolean;
  debugDraw: boolean;
}

export function parseDebugParams(search: string): DebugParams {
  const params = new URLSearchParams(search);
  const seedRaw = params.get('seed');
  const seed = seedRaw !== null && seedRaw !== '' ? Number(seedRaw) : null;
  return {
    seed: seed !== null && Number.isFinite(seed) ? seed : null,
    stage: params.get('stage'),
    autoGas: params.get('auto') === 'gas',
    debugDraw: params.get('debug') === '1',
  };
}
