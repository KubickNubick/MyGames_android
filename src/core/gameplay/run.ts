/**
 * State machine заезда: Ready → Driving → Dead | OutOfFuel → Results.
 * Чистый модуль: сцена сообщает события (смерть, монеты) и дёргает update.
 */
import { RUN_END } from '../../data/gameplay';

export type RunState = 'ready' | 'driving' | 'dead' | 'outOfFuel' | 'results';

export type EndReason = 'crash' | 'outOfFuel';

export class Run {
  private stateValue: RunState = 'ready';
  private endReasonValue: EndReason | null = null;
  private coinsValue = 0;
  private maxX: number;
  private stallTimer = 0;
  private resultsTimer = 0;
  private readonly changeCallbacks: Array<(state: RunState) => void> = [];

  constructor(private readonly startX = 0) {
    this.maxX = startX;
  }

  get state(): RunState {
    return this.stateValue;
  }

  get endReason(): EndReason | null {
    return this.endReasonValue;
  }

  get coins(): number {
    return this.coinsValue;
  }

  /** Дистанция заезда, м (максимальный прогресс вперёд от старта). */
  get distance(): number {
    return Math.max(0, this.maxX - this.startX);
  }

  get isDriving(): boolean {
    return this.stateValue === 'driving';
  }

  onChange(cb: (state: RunState) => void): void {
    this.changeCallbacks.push(cb);
  }

  /** Старт по первому вводу игрока. */
  start(): void {
    if (this.stateValue === 'ready') this.transition('driving');
  }

  /** Голова коснулась рельефа. */
  notifyDeath(): void {
    if (this.stateValue === 'driving') {
      this.endReasonValue = 'crash';
      this.transition('dead');
    }
  }

  addCoins(n: number): void {
    if (this.stateValue === 'driving') this.coinsValue += n;
  }

  /** Вызывать каждый fixed step. */
  update(dt: number, carX: number, speedAbs: number, fuelEmpty: boolean): void {
    switch (this.stateValue) {
      case 'driving':
        this.maxX = Math.max(this.maxX, carX);
        if (fuelEmpty && speedAbs < RUN_END.stallSpeed) {
          this.stallTimer += dt;
          if (this.stallTimer >= RUN_END.stallSeconds) {
            this.endReasonValue = 'outOfFuel';
            this.transition('outOfFuel');
          }
        } else {
          this.stallTimer = 0;
        }
        break;
      case 'dead':
        this.resultsTimer += dt;
        if (this.resultsTimer >= RUN_END.deathToResultsDelay) this.transition('results');
        break;
      case 'outOfFuel':
        this.resultsTimer += dt;
        if (this.resultsTimer >= RUN_END.fuelToResultsDelay) this.transition('results');
        break;
      case 'ready':
      case 'results':
        break;
    }
  }

  private transition(next: RunState): void {
    this.stateValue = next;
    this.resultsTimer = next === 'dead' || next === 'outOfFuel' ? 0 : this.resultsTimer;
    for (const cb of this.changeCallbacks) cb(next);
  }
}
