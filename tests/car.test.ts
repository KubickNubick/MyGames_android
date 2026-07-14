import { describe, it, expect } from 'vitest';
import { createWorld, FIXED_DT, FixedStepper } from '../src/core/physics/world';
import { createFlatGround } from '../src/core/physics/terrainBody';
import { createCar, type Car, type DriveInput } from '../src/core/physics/car';
import { JEEP } from '../src/data/vehicles';

/** Прогнать seconds секунд симуляции с заданным вводом. */
function simulate(world: ReturnType<typeof createWorld>, car: Car, input: DriveInput, seconds: number): void {
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    car.setInput(input);
    car.step();
    world.step(FIXED_DT);
  }
}

function setupFlat(): { world: ReturnType<typeof createWorld>; car: Car } {
  const world = createWorld();
  createFlatGround(world, -20, 500, 0);
  // Спавн над землёй: колёса на y+0.318, радиус 0.35 ⇒ центр шасси ~ -0.67 м.
  const car = createCar(world, JEEP, { x: 0, y: -0.8 });
  return { world, car };
}

describe('машина (фаза 1)', () => {
  it('автогаз: проезжает 50 м по плоскости за < 10 с симуляции', () => {
    const { world, car } = setupFlat();
    simulate(world, car, 'gas', 10);
    expect(car.dead).toBe(false);
    expect(car.chassis.getPosition().x).toBeGreaterThan(50);
  });

  it('тормоз гасит скорость, затем включается задний ход', () => {
    const { world, car } = setupFlat();
    simulate(world, car, 'gas', 3);
    expect(car.getForwardSpeed()).toBeGreaterThan(5);
    simulate(world, car, 'brake', 3);
    // после торможения и реверса машина едет назад
    expect(car.getForwardSpeed()).toBeLessThan(-0.5);
  });

  it('свободный накат: без газа скорость падает, но не мгновенно', () => {
    const { world, car } = setupFlat();
    simulate(world, car, 'gas', 4);
    const v0 = car.getForwardSpeed();
    simulate(world, car, 'none', 1.5);
    const v1 = car.getForwardSpeed();
    expect(v1).toBeLessThan(v0); // замедляется
    expect(v1).toBeGreaterThan(v0 * 0.5); // но не колом
  });

  it('в воздухе газ крутит назад (backflip), тормоз — вперёд (frontflip)', () => {
    // Мир без земли — машина в свободном падении.
    const worldGas = createWorld();
    const carGas = createCar(worldGas, JEEP, { x: 0, y: 0 });
    simulate(worldGas, carGas, 'gas', 0.5);
    // Нос вверх при Y-вниз = отрицательная угловая скорость.
    expect(carGas.isAirborne()).toBe(true);
    expect(carGas.chassis.getAngularVelocity()).toBeLessThan(-0.5);

    const worldBrake = createWorld();
    const carBrake = createCar(worldBrake, JEEP, { x: 0, y: 0 });
    simulate(worldBrake, carBrake, 'brake', 0.5);
    expect(carBrake.chassis.getAngularVelocity()).toBeGreaterThan(0.5);
  });

  it('приземление на голову ⇒ смерть', () => {
    const world = createWorld();
    createFlatGround(world, -20, 20, 0);
    // Машина вверх колёсами чуть над землёй.
    const car = createCar(world, JEEP, { x: 0, y: -1.2 });
    car.chassis.setAngle(Math.PI);
    let died = false;
    car.onDeath(() => {
      died = true;
    });
    simulate(world, car, 'none', 2);
    expect(died).toBe(true);
    expect(car.dead).toBe(true);
  });

  it('контакт колёс с землёй не считается смертью', () => {
    const { world, car } = setupFlat();
    simulate(world, car, 'gas', 5);
    expect(car.dead).toBe(false);
    expect(car.isWheelOnGround('rear')).toBe(true);
    expect(car.isWheelOnGround('front')).toBe(true);
    expect(car.isAirborne()).toBe(false);
  });
});

describe('FixedStepper', () => {
  it('дробит произвольный dt на шаги по 1/60', () => {
    const stepper = new FixedStepper();
    let steps = 0;
    stepper.update(3.5 * FIXED_DT, () => steps++);
    expect(steps).toBe(3);
    stepper.update(0.6 * FIXED_DT, () => steps++); // 0.5 + 0.6 в аккумуляторе
    expect(steps).toBe(4);
  });

  it('ограничивает число шагов после лага', () => {
    const stepper = new FixedStepper(5);
    let steps = 0;
    stepper.update(1.0, () => steps++); // секунда лага ≠ 60 шагов
    expect(steps).toBe(5);
  });
});
