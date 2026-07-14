import { describe, it, expect } from 'vitest';
import { FuelTank } from '../src/core/gameplay/fuel';
import { FlipTracker } from '../src/core/gameplay/flips';
import { computeJumpReward } from '../src/core/gameplay/score';
import { Run } from '../src/core/gameplay/run';
import { PickupPlanner, PickupField, type Pickup } from '../src/core/gameplay/pickups';
import { FUEL, RUN_END, COIN_GROUPS, FUEL_CANS } from '../src/data/gameplay';
import { createHeightFn } from '../src/core/terrain/generator';
import { COUNTRYSIDE } from '../src/data/stages';
import { createWorld, FIXED_DT } from '../src/core/physics/world';
import { createFlatGround } from '../src/core/physics/terrainBody';
import { createCar } from '../src/core/physics/car';
import { JEEP } from '../src/data/vehicles';

const DT = 1 / 60;

describe('топливо', () => {
  it('полный бак сгорает примерно за 30 с', () => {
    const tank = new FuelTank(FUEL.tankCapacity, FUEL.consumptionPerSecond);
    let t = 0;
    while (!tank.isEmpty) {
      tank.consume(DT);
      t += DT;
      expect(t).toBeLessThan(40); // защита от вечного цикла
    }
    expect(t).toBeGreaterThan(29);
    expect(t).toBeLessThan(32);
  });

  it('уровень не уходит ниже нуля, refill возвращает полный бак', () => {
    const tank = new FuelTank(100, 50);
    tank.consume(10);
    expect(tank.level).toBe(0);
    expect(tank.isEmpty).toBe(true);
    tank.refill();
    expect(tank.level).toBe(100);
    expect(tank.fraction).toBe(1);
  });
});

describe('детектор флипов (синтетика)', () => {
  function fly(tracker: FlipTracker, seconds: number, omega: number): void {
    for (let t = 0; t < seconds; t += DT) {
      expect(tracker.update(DT, true, omega)).toBeNull();
    }
  }

  it('2 полных оборота назад ⇒ 2 backflip', () => {
    const tracker = new FlipTracker();
    // ω = -2π рад/с в течение 2 с ⇒ сумма -4π
    fly(tracker, 2, -2 * Math.PI);
    const result = tracker.update(DT, false, 0);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('backflip');
    expect(result!.flips).toBe(2);
    expect(result!.airTimeSeconds).toBeCloseTo(2, 1);
  });

  it('положительное вращение ⇒ frontflip', () => {
    const tracker = new FlipTracker();
    fly(tracker, 1.2, 2 * Math.PI);
    const result = tracker.update(DT, false, 0)!;
    expect(result.kind).toBe('frontflip');
    expect(result.flips).toBe(1);
  });

  it('неполный оборот ⇒ 0 флипов, но airtime есть', () => {
    const tracker = new FlipTracker();
    fly(tracker, 2, -1); // сумма -2 рад < 2π
    const result = tracker.update(DT, false, 0)!;
    expect(result.flips).toBe(0);
    expect(result.airTimeSeconds).toBeCloseTo(2, 1);
  });

  it('на земле ничего не выдаёт', () => {
    const tracker = new FlipTracker();
    for (let i = 0; i < 100; i++) {
      expect(tracker.update(DT, false, 5)).toBeNull();
    }
  });
});

describe('награды', () => {
  it('одиночный backflip = 50', () => {
    const r = computeJumpReward({ flips: 1, kind: 'backflip', airTimeSeconds: 1 });
    expect(r.coins).toBe(50);
    expect(r.entries).toEqual([{ label: 'BACKFLIP', coins: 50 }]);
  });

  it('комбо: 2 флипа = 50 + 75, 3 флипа = 50 + 75 + 100', () => {
    expect(computeJumpReward({ flips: 2, kind: 'frontflip', airTimeSeconds: 1 }).coins).toBe(125);
    expect(computeJumpReward({ flips: 3, kind: 'backflip', airTimeSeconds: 1 }).coins).toBe(225);
  });

  it('airtime: 2 монеты/с сверх 1.5 с', () => {
    const r = computeJumpReward({ flips: 0, kind: 'backflip', airTimeSeconds: 3.5 });
    expect(r.coins).toBe(4); // (3.5 - 1.5) * 2
    expect(r.entries).toEqual([{ label: 'AIRTIME', coins: 4 }]);
  });

  it('короткий прыжок без флипов = ничего', () => {
    const r = computeJumpReward({ flips: 0, kind: 'frontflip', airTimeSeconds: 1.0 });
    expect(r.coins).toBe(0);
    expect(r.entries).toEqual([]);
  });
});

describe('state machine заезда', () => {
  it('Ready → Driving → Dead → Results (причина crash)', () => {
    const run = new Run(0);
    const states: string[] = [];
    run.onChange((s) => states.push(s));

    expect(run.state).toBe('ready');
    run.start();
    expect(run.state).toBe('driving');

    run.update(DT, 10, 5, false);
    expect(run.distance).toBe(10);

    run.notifyDeath();
    expect(run.state).toBe('dead');
    for (let t = 0; t < RUN_END.deathToResultsDelay + 0.1; t += DT) run.update(DT, 10, 0, false);
    expect(run.state).toBe('results');
    expect(run.endReason).toBe('crash');
    expect(states).toEqual(['driving', 'dead', 'results']);
  });

  it('без топлива и стоя 3 с ⇒ OutOfFuel → Results', () => {
    const run = new Run(0);
    run.start();
    // едем без топлива — конец не наступает
    for (let t = 0; t < 4; t += DT) run.update(DT, 100, 2, true);
    expect(run.state).toBe('driving');
    // встали
    for (let t = 0; t < RUN_END.stallSeconds + 0.1; t += DT) run.update(DT, 100, 0.1, true);
    expect(run.state).toBe('outOfFuel');
    expect(run.endReason).toBe('outOfFuel');
    for (let t = 0; t < RUN_END.fuelToResultsDelay + 0.1; t += DT) run.update(DT, 100, 0, true);
    expect(run.state).toBe('results');
  });

  it('краткая остановка без топлива сбрасывает таймер', () => {
    const run = new Run(0);
    run.start();
    for (let t = 0; t < 2; t += DT) run.update(DT, 50, 0.1, true); // стоим 2 с
    run.update(DT, 50, 1.5, true); // покатились
    for (let t = 0; t < 2; t += DT) run.update(DT, 50, 0.1, true); // снова стоим 2 с
    expect(run.state).toBe('driving'); // таймер сбрасывался — конца нет
  });

  it('монеты и дистанция копятся только в driving', () => {
    const run = new Run(100);
    run.addCoins(5); // ready — игнор
    expect(run.coins).toBe(0);
    run.start();
    run.addCoins(5);
    run.update(DT, 150, 5, false);
    run.update(DT, 130, 5, false); // откат назад не уменьшает дистанцию
    expect(run.coins).toBe(5);
    expect(run.distance).toBe(50);
  });
});

describe('планировщик пикапов', () => {
  const h = createHeightFn(42, COUNTRYSIDE.terrain);

  it('детерминизм: одинаковый seed ⇒ одинаковая расстановка', () => {
    const a = new PickupPlanner(42, h).planUpTo(1000);
    const b = new PickupPlanner(42, h).planUpTo(1000);
    expect(a).toEqual(b);
    const c = new PickupPlanner(43, h).planUpTo(1000);
    expect(a).not.toEqual(c);
  });

  it('ленивое планирование даёт тот же набор, что и разовое', () => {
    const byId = (a: Pickup, b: Pickup) => a.id - b.id;
    const lazy = new PickupPlanner(42, h);
    const parts = [...lazy.planUpTo(200), ...lazy.planUpTo(600), ...lazy.planUpTo(1000)].sort(byId);
    const whole = new PickupPlanner(42, h).planUpTo(1000).sort(byId);
    expect(parts).toEqual(whole);
  });

  it('группы монет 6–12 шт, интервалы канистр 100–140 м', () => {
    const pickups = new PickupPlanner(42, h).planUpTo(3000);
    const coins = pickups.filter((p) => p.kind === 'coin');
    const cans = pickups.filter((p) => p.kind === 'fuel');
    expect(coins.length).toBeGreaterThan(100);
    expect(cans.length).toBeGreaterThan(15);

    // группы: разбиваем по разрывам > spacing
    let groupSize = 1;
    const sizes: number[] = [];
    for (let i = 1; i < coins.length; i++) {
      if (coins[i].x - coins[i - 1].x <= COIN_GROUPS.spacingM + 1e-6) groupSize++;
      else {
        sizes.push(groupSize);
        groupSize = 1;
      }
    }
    for (const s of sizes) {
      expect(s).toBeGreaterThanOrEqual(COIN_GROUPS.sizeMin);
      expect(s).toBeLessThanOrEqual(COIN_GROUPS.sizeMax);
    }

    for (let i = 1; i < cans.length; i++) {
      const gap = cans[i].x - cans[i - 1].x;
      expect(gap).toBeGreaterThanOrEqual(FUEL_CANS.intervalMeanM - FUEL_CANS.intervalJitterM - 1e-6);
      expect(gap).toBeLessThanOrEqual(FUEL_CANS.intervalMeanM + FUEL_CANS.intervalJitterM + 1e-6);
    }
  });

  it('монеты висят над поверхностью', () => {
    const pickups = new PickupPlanner(42, h).planUpTo(2000);
    for (const p of pickups) {
      // Y вниз: выше поверхности = меньше
      expect(p.y).toBeLessThan(h(p.x));
    }
  });
});

describe('PickupField: сбор сенсором', () => {
  it('машина проезжает сквозь монету и канистру — обе собраны', () => {
    const world = createWorld();
    createFlatGround(world, -20, 200, 0);
    const flat = () => 0;
    // канистра прямо по курсу на высоте машины
    const planner = new PickupPlanner(1, flat);
    const field = new PickupField(world, planner);
    const collected: Pickup[] = [];
    field.onCollect((p) => collected.push(p));

    const car = createCar(world, JEEP, { x: 0, y: -0.8 });
    for (let i = 0; i < 60 * 12; i++) {
      car.setInput('gas');
      car.step();
      world.step(FIXED_DT);
      field.update(car.chassis.getPosition().x);
    }

    expect(collected.some((p) => p.kind === 'coin')).toBe(true);
    expect(collected.some((p) => p.kind === 'fuel')).toBe(true);
    // собранные не дублируются
    const ids = collected.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    field.destroy();
  });
});
