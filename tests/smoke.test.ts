import { describe, it, expect } from 'vitest';
import { parseDebugParams } from '../src/config';
import { World, Vec2, Circle } from 'planck';

describe('каркас проекта', () => {
  it('parseDebugParams разбирает URL-параметры отладки', () => {
    const p = parseDebugParams('?seed=42&stage=desert&auto=gas&debug=1&x=500&scene=garage');
    expect(p).toEqual({
      seed: 42,
      stage: 'desert',
      autoGas: true,
      debugDraw: true,
      spawnX: 500,
      scene: 'garage',
    });
  });

  it('parseDebugParams даёт безопасные значения по умолчанию', () => {
    const p = parseDebugParams('');
    expect(p).toEqual({
      seed: null,
      stage: null,
      autoGas: false,
      debugDraw: false,
      spawnX: 0,
      scene: 'game',
    });
  });

  it('planck работает в Node: тело падает под гравитацией', () => {
    const world = new World({ gravity: new Vec2(0, 9.8) });
    const body = world.createDynamicBody(new Vec2(0, 0));
    body.createFixture({ shape: new Circle(0.5), density: 1 });
    for (let i = 0; i < 60; i++) world.step(1 / 60);
    expect(body.getPosition().y).toBeGreaterThan(1);
  });
});
