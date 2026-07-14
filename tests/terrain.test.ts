import { describe, it, expect } from 'vitest';
import { mulberry32, createValueNoise1D, createFbm1D } from '../src/core/terrain/noise';
import { createHeightFn } from '../src/core/terrain/generator';
import { ChunkManager, type Chunk } from '../src/core/terrain/chunks';
import { COUNTRYSIDE } from '../src/data/stages';
import { createWorld, FIXED_DT } from '../src/core/physics/world';
import { createTerrainBody } from '../src/core/physics/terrainBody';
import { createCar } from '../src/core/physics/car';
import { JEEP } from '../src/data/vehicles';

const PROFILE = COUNTRYSIDE.terrain;

describe('noise', () => {
  it('mulberry32 детерминирован и в [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(42)()).not.toBe(mulberry32(43)());
  });

  it('value noise гладкий и в [-1, 1]', () => {
    const n = createValueNoise1D(7);
    let prev = n(0);
    for (let u = 0.01; u < 20; u += 0.01) {
      const v = n(u);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(Math.abs(v - prev)).toBeLessThan(0.06); // нет скачков
      prev = v;
    }
  });

  it('fbm в [-1, 1] и различается по seed', () => {
    const a = createFbm1D(1, 3);
    const b = createFbm1D(2, 3);
    let differs = false;
    for (let u = 0; u < 10; u += 0.1) {
      expect(Math.abs(a(u))).toBeLessThanOrEqual(1);
      if (Math.abs(a(u) - b(u)) > 1e-9) differs = true;
    }
    expect(differs).toBe(true);
  });
});

describe('генератор рельефа', () => {
  it('детерминизм: одинаковый seed ⇒ одинаковые высоты (инвариант №4)', () => {
    const h1 = createHeightFn(42, PROFILE);
    const h2 = createHeightFn(42, PROFILE);
    for (let x = -100; x <= 1500; x += 0.37) {
      expect(h1(x)).toBe(h2(x));
    }
  });

  it('разные seed ⇒ разный рельеф', () => {
    const h1 = createHeightFn(42, PROFILE);
    const h2 = createHeightFn(43, PROFILE);
    let differs = false;
    for (let x = 150; x <= 400; x += 1) {
      if (Math.abs(h1(x) - h2(x)) > 0.01) differs = true;
    }
    expect(differs).toBe(true);
  });

  it('не зависит от порядка запросов', () => {
    const h1 = createHeightFn(9, PROFILE);
    const h2 = createHeightFn(9, PROFILE);
    const xs = [500, 3, 77.7, -20, 1200, 0.1];
    const forward = xs.map((x) => h1(x));
    const backward = [...xs].reverse().map((x) => h2(x));
    expect(forward).toEqual(backward.reverse());
  });

  it('зона спавна ровная, амплитуда растёт и ограничена максимумом', () => {
    const h = createHeightFn(42, PROFILE);
    for (let x = 0; x <= PROFILE.flatUntilX; x += 0.5) {
      expect(Math.abs(h(x))).toBeLessThan(1e-9);
    }
    // амплитуда никогда не превышает профильный максимум
    let maxAbs = 0;
    for (let x = 0; x <= 5000; x += 0.75) {
      maxAbs = Math.max(maxAbs, Math.abs(h(x)));
      expect(Math.abs(h(x))).toBeLessThanOrEqual(PROFILE.maxAmplitude);
    }
    // и на дальних участках рельеф реально большой (профиль работает)
    expect(maxAbs).toBeGreaterThan(2);
  });

  it('непрерывность: нет скачков между соседними точками сетки', () => {
    const h = createHeightFn(42, PROFILE);
    let prev = h(0);
    for (let x = 0.25; x <= 3000; x += 0.25) {
      const y = h(x);
      // максимально возможный уклон ограничен (нет «стен»)
      expect(Math.abs(y - prev)).toBeLessThan(1.0);
      prev = y;
    }
  });
});

describe('ChunkManager', () => {
  function makeManager(created: Chunk[], destroyed: Chunk[]): ChunkManager {
    const h = createHeightFn(42, PROFILE);
    return new ChunkManager(h, {
      onCreate: (c) => created.push(c),
      onDestroy: (c) => destroyed.push(c),
    });
  }

  it('держит окно чанков: 2 вперёд, 1 позади', () => {
    const created: Chunk[] = [];
    const destroyed: Chunk[] = [];
    const m = makeManager(created, destroyed);

    m.update(0); // чанк 0 ⇒ окно [-1..2]
    expect(m.getActiveIndices()).toEqual([-1, 0, 1, 2]);
    expect(created.length).toBe(4);

    m.update(100); // чанк 2 ⇒ окно [1..4]
    expect(m.getActiveIndices()).toEqual([1, 2, 3, 4]);
    expect(destroyed.map((c) => c.index).sort()).toEqual([-1, 0]);
  });

  it('память не растёт: активных чанков всегда ≤ ahead+behind+1', () => {
    const created: Chunk[] = [];
    const destroyed: Chunk[] = [];
    const m = makeManager(created, destroyed);
    for (let x = 0; x < 2000; x += 7) {
      m.update(x);
      expect(m.getActiveCount()).toBeLessThanOrEqual(4);
    }
    expect(created.length - destroyed.length).toBe(m.getActiveCount());
  });

  it('стыки чанков бит-в-бит: общая граничная точка идентична', () => {
    const created: Chunk[] = [];
    const m = makeManager(created, []);
    m.update(24); // чанки -1..2
    const byIndex = new Map(created.map((c) => [c.index, c]));
    for (const i of [-1, 0, 1]) {
      const left = byIndex.get(i)!;
      const right = byIndex.get(i + 1)!;
      const lastLeft = left.points[left.points.length - 1];
      const firstRight = right.points[0];
      expect(lastLeft.x).toBe(firstRight.x);
      expect(lastLeft.y).toBe(firstRight.y);
    }
  });

  it('точки чанка идут с шагом 0.75 м и покрывают 48 м', () => {
    const created: Chunk[] = [];
    const m = makeManager(created, []);
    m.update(0);
    const chunk = created.find((c) => c.index === 0)!;
    expect(chunk.points.length).toBe(65);
    expect(chunk.points[0].x).toBe(0);
    expect(chunk.points[64].x).toBe(48);
  });
});

describe('интеграция: машина едет по сгенерированному рельефу', () => {
  it('автогаз на seed=42: 20 c симуляции, едет далеко и не проваливается', () => {
    const world = createWorld();
    const h = createHeightFn(42, PROFILE);
    const manager = new ChunkManager(h, {
      onCreate: (chunk) => {
        const body = createTerrainBody(world, chunk.points);
        bodies.set(chunk.index, body);
      },
      onDestroy: (chunk) => {
        const body = bodies.get(chunk.index);
        if (body) {
          world.destroyBody(body);
          bodies.delete(chunk.index);
        }
      },
    });
    const bodies = new Map<number, ReturnType<typeof createTerrainBody>>();

    const car = createCar(world, JEEP, { x: 0, y: h(0) - 1.0 });
    const steps = Math.round(20 / FIXED_DT);
    for (let i = 0; i < steps; i++) {
      manager.update(car.chassis.getPosition().x);
      car.setInput('gas');
      car.step();
      world.step(FIXED_DT);
    }
    const pos = car.chassis.getPosition();
    expect(pos.x).toBeGreaterThan(80); // уехал далеко
    // не провалился и не улетел: держится в разумном коридоре вокруг рельефа
    expect(Math.abs(pos.y - h(pos.x))).toBeLessThan(10);
  });
});
