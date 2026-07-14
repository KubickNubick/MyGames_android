/** Топливный бак. Чистый модуль (инвариант №3). */

export class FuelTank {
  private levelValue: number;

  constructor(
    private readonly capacity: number,
    private readonly consumptionPerSecond: number,
  ) {
    this.levelValue = capacity;
  }

  get level(): number {
    return this.levelValue;
  }

  get fraction(): number {
    return this.levelValue / this.capacity;
  }

  get isEmpty(): boolean {
    return this.levelValue <= 0;
  }

  /** Расход за dt секунд (звать только пока идёт заезд). */
  consume(dt: number): void {
    this.levelValue = Math.max(0, this.levelValue - this.consumptionPerSecond * dt);
  }

  /** Подбор канистры — полный бак. */
  refill(): void {
    this.levelValue = this.capacity;
  }
}
