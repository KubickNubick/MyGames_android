import { describe, it, expect } from 'vitest';
import { applyUpgrades, upgradePrice, NO_UPGRADES, UPGRADES, UPGRADE_TARGETS } from '../src/data/upgrades';
import { JEEP } from '../src/data/vehicles';
import { createWorld, FIXED_DT } from '../src/core/physics/world';
import { createFlatGround } from '../src/core/physics/terrainBody';
import { createCar } from '../src/core/physics/car';

describe('цены апгрейдов', () => {
  it('base × 1.35^lvl', () => {
    expect(upgradePrice('engine', 0)).toBe(300);
    expect(upgradePrice('engine', 1)).toBe(405);
    expect(upgradePrice('engine', 2)).toBe(Math.round(300 * 1.35 ** 2)); // 547
    expect(upgradePrice('tires', 0)).toBe(200);
    expect(upgradePrice('fourWheelDrive', 9)).toBe(Math.round(500 * 1.35 ** 9));
  });
});

describe('applyUpgrades', () => {
  it('уровень 0 — параметры не меняются', () => {
    const p = applyUpgrades(JEEP, NO_UPGRADES);
    expect(p.engine).toEqual(JEEP.engine);
    expect(p.suspension).toEqual(JEEP.suspension);
    expect(p.wheel.friction).toBe(JEEP.wheel.friction);
    expect(p.fourWheelDrive).toBe(false);
  });

  it('максимальные уровни выходят на целевые значения из таблицы PLAN', () => {
    const p = applyUpgrades(JEEP, { engine: 10, suspension: 10, tires: 10, fourWheelDrive: 10 });
    expect(p.engine.torque).toBe(UPGRADE_TARGETS.engine.torque); // 900
    expect(p.engine.maxWheelSpeed).toBe(UPGRADE_TARGETS.engine.maxWheelSpeed); // 70
    expect(p.suspension.frequencyHz).toBe(UPGRADE_TARGETS.suspension.frequencyHz); // 6.0
    expect(p.suspension.dampingRatio).toBe(UPGRADE_TARGETS.suspension.dampingRatio); // 0.85
    expect(p.wheel.friction).toBe(UPGRADE_TARGETS.tires.friction); // 3.5
    expect(p.fourWheelDrive).toBe(true);
    expect(p.frontTorqueShare).toBe(UPGRADE_TARGETS.fourWheelDrive.shareAtMax); // 0.4
  });

  it('промежуточный уровень — линейно между стартом и максимумом', () => {
    const p = applyUpgrades(JEEP, { ...NO_UPGRADES, engine: 5 });
    const mid = (JEEP.engine.torque + UPGRADE_TARGETS.engine.torque) / 2;
    expect(p.engine.torque).toBeCloseTo(mid, 6);
  });

  it('не мутирует базовые параметры', () => {
    const before = JSON.stringify(JEEP);
    applyUpgrades(JEEP, { engine: 10, suspension: 10, tires: 10, fourWheelDrive: 10 });
    expect(JSON.stringify(JEEP)).toBe(before);
  });

  it('уровни выше максимума и дробные — зажимаются', () => {
    const p = applyUpgrades(JEEP, { ...NO_UPGRADES, engine: 99.7 });
    expect(p.engine.torque).toBe(UPGRADE_TARGETS.engine.torque);
  });

  it('4WD включается с 1 уровня', () => {
    expect(applyUpgrades(JEEP, { ...NO_UPGRADES, fourWheelDrive: 0 }).fourWheelDrive).toBe(false);
    const on = applyUpgrades(JEEP, { ...NO_UPGRADES, fourWheelDrive: 1 });
    expect(on.fourWheelDrive).toBe(true);
    expect(on.frontTorqueShare).toBeGreaterThan(0.1);
  });
});

describe('критерий приёмки: Engine 3 заметно мощнее Engine 0', () => {
  function distanceAfter(seconds: number, engineLevel: number): number {
    const world = createWorld();
    createFlatGround(world, -20, 500, 0);
    const params = applyUpgrades(JEEP, { ...NO_UPGRADES, engine: engineLevel });
    const car = createCar(world, params, { x: 0, y: -0.8 });
    const steps = Math.round(seconds / FIXED_DT);
    for (let i = 0; i < steps; i++) {
      car.setInput('gas');
      car.step();
      world.step(FIXED_DT);
    }
    return car.chassis.getPosition().x;
  }

  it('за 5 с Engine 3 уезжает заметно дальше (≥ 15%)', () => {
    const d0 = distanceAfter(5, 0);
    const d3 = distanceAfter(5, 3);
    expect(d3).toBeGreaterThan(d0 * 1.15);
  });
});

describe('согласованность веток', () => {
  it('у всех веток 10 уровней', () => {
    for (const def of Object.values(UPGRADES)) {
      expect(def.maxLevel).toBe(10);
      expect(def.basePrice).toBeGreaterThan(0);
    }
  });
});
