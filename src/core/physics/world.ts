/**
 * Мир planck и fixed timestep. Физика в МЕТРАХ, ось Y вниз.
 * Никакой физики внутри render loop — только через FixedStepper (инвариант №2).
 */
import { World, Vec2 } from 'planck';

export const FIXED_DT = 1 / 60;
export const GRAVITY_Y = 9.8;

export function createWorld(gravityY: number = GRAVITY_Y): World {
  return new World({ gravity: new Vec2(0, gravityY) });
}

/**
 * Аккумулятор фиксированного шага: рендер зовёт update(dt) с любым FPS,
 * колбэк выполняется ровно кратно FIXED_DT.
 */
export class FixedStepper {
  private accumulator = 0;

  constructor(private readonly maxStepsPerUpdate = 5) {}

  update(dtSeconds: number, stepFn: (fixedDt: number) => void): void {
    // Защита от «спирали смерти» после лага/потери фокуса вкладки.
    this.accumulator += Math.min(dtSeconds, 0.25);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < this.maxStepsPerUpdate) {
      stepFn(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === this.maxStepsPerUpdate) {
      this.accumulator = 0;
    }
  }
}
