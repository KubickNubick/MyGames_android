import { describe, it, expect } from 'vitest';
import { STAGES, STAGE_IDS, DEFAULT_STAGE_ID, MOON } from '../src/data/stages';
import { createHeightFn } from '../src/core/terrain/generator';

describe('данные этапов', () => {
  it('4 этапа, дефолтный существует', () => {
    expect(STAGE_IDS).toEqual(['countryside', 'desert', 'moon', 'cave']);
    expect(STAGES[DEFAULT_STAGE_ID]).toBeDefined();
  });

  it('Луна: гравитация 1.62', () => {
    expect(MOON.gravityY).toBe(1.62);
  });

  it('профили корректны и генератор работает на каждом этапе', () => {
    for (const stage of Object.values(STAGES)) {
      const t = stage.terrain;
      expect(stage.gravityY).toBeGreaterThan(0);
      expect(t.maxAmplitude).toBeGreaterThan(t.baseAmplitude);
      expect(t.wavelengthStart).toBeGreaterThan(t.wavelengthEnd);
      expect(t.octaves).toBeGreaterThanOrEqual(2);
      expect(t.octaves).toBeLessThanOrEqual(3);

      const h = createHeightFn(42, t);
      for (let x = 0; x <= 1000; x += 5) {
        expect(Number.isFinite(h(x))).toBe(true);
        expect(Math.abs(h(x))).toBeLessThanOrEqual(t.maxAmplitude);
      }
      // зона спавна ровная (Math.abs: -амплитуда×0 даёт -0)
      expect(Math.abs(h(0))).toBe(0);
      expect(Math.abs(h(t.flatUntilX / 2))).toBeLessThan(1e-9);
    }
  });

  it('у каждого этапа полный набор визуала', () => {
    for (const stage of Object.values(STAGES)) {
      expect(stage.visuals.bgSet.length).toBeGreaterThan(0);
      expect(stage.visuals.terrainSet.length).toBeGreaterThan(0);
      expect(stage.visuals.surfaceBand).toHaveLength(2);
    }
  });
});
