/**
 * Детектор флипов: пока машина в воздухе — интегрируем угловую скорость шасси,
 * на приземлении считаем полные обороты. Ось Y вниз: отрицательная сумма
 * (нос вверх) = backflip, положительная = frontflip.
 */

export interface FlipResult {
  /** Полных оборотов: floor(|Σω·dt| / 2π). */
  flips: number;
  kind: 'backflip' | 'frontflip';
  /** Время в воздухе, с. */
  airTimeSeconds: number;
}

export class FlipTracker {
  private airborne = false;
  private rotationSum = 0;
  private airTime = 0;

  /**
   * Вызывать каждый fixed step. Возвращает результат прыжка в момент
   * приземления, иначе null.
   */
  update(dt: number, isAirborne: boolean, angularVelocity: number): FlipResult | null {
    if (isAirborne) {
      if (!this.airborne) {
        this.airborne = true;
        this.rotationSum = 0;
        this.airTime = 0;
      }
      this.rotationSum += angularVelocity * dt;
      this.airTime += dt;
      return null;
    }

    if (!this.airborne) return null;

    // Приземление.
    this.airborne = false;
    const result: FlipResult = {
      flips: Math.floor(Math.abs(this.rotationSum) / (2 * Math.PI)),
      kind: this.rotationSum < 0 ? 'backflip' : 'frontflip',
      airTimeSeconds: this.airTime,
    };
    this.rotationSum = 0;
    this.airTime = 0;
    return result;
  }

  get isAirborne(): boolean {
    return this.airborne;
  }

  reset(): void {
    this.airborne = false;
    this.rotationSum = 0;
    this.airTime = 0;
  }
}
