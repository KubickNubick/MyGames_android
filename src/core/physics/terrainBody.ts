/**
 * Статические тела рельефа: Chain по точкам поверхности + боксы-препятствия.
 * Все фикстуры помечены userData {type:'terrain'} — по ней машина
 * детектирует контакт колёс с землёй и смерть головы.
 */
import { type World, type Body, Vec2, Chain, Box } from 'planck';
import type { Point2 } from '../../data/vehicles';

export interface TerrainFixtureData {
  type: 'terrain';
}

export const TERRAIN_USER_DATA: TerrainFixtureData = { type: 'terrain' };

export const TERRAIN_FRICTION = 1.0;

export function isTerrainFixtureData(data: unknown): data is TerrainFixtureData {
  return typeof data === 'object' && data !== null && (data as TerrainFixtureData).type === 'terrain';
}

/** Chain-тело по точкам поверхности (метры, Y вниз). */
export function createTerrainBody(world: World, points: Point2[], friction = TERRAIN_FRICTION): Body {
  const body = world.createBody();
  body.createFixture({
    shape: new Chain(
      points.map((p) => new Vec2(p.x, p.y)),
      false,
    ),
    friction,
    userData: TERRAIN_USER_DATA,
  });
  return body;
}

/** Плоская земля на высоте y от x0 до x1. */
export function createFlatGround(world: World, x0: number, x1: number, y = 0): Body {
  return createTerrainBody(world, [
    { x: x0, y },
    { x: x1, y },
  ]);
}

/** Статический бокс (ступенька/препятствие), центр в (cx, cy), полуразмеры в метрах. */
export function createStaticBox(
  world: World,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
): Body {
  const body = world.createBody({ position: new Vec2(cx, cy) });
  body.createFixture({
    shape: new Box(halfWidth, halfHeight),
    friction: TERRAIN_FRICTION,
    userData: TERRAIN_USER_DATA,
  });
  return body;
}
