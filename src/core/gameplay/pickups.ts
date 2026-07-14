/**
 * Пикапы: монеты и канистры.
 *
 * PickupPlanner — чистый детерминированный планировщик позиций (инвариант №4:
 * одинаковый seed ⇒ одинаковая расстановка). PickupField — сенсорные тела
 * в мире planck со стримингом вперёд/удалением позади.
 */
import { type World, type Body, type Contact, Vec2, Circle, Box } from 'planck';
import { mulberry32 } from '../terrain/noise';
import type { HeightFn } from '../terrain/generator';
import { COIN_GROUPS, FUEL_CANS, PICKUP_STREAM } from '../../data/gameplay';

export type PickupKind = 'coin' | 'fuel';

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
}

interface PickupFixtureData {
  type: 'pickup';
  pickup: Pickup;
}

function isPickupFixtureData(data: unknown): data is PickupFixtureData {
  return typeof data === 'object' && data !== null && (data as PickupFixtureData).type === 'pickup';
}

/** Детерминированная лента пикапов: выдаёт новые позиции по мере продвижения вперёд. */
export class PickupPlanner {
  private readonly coinRng: () => number;
  private readonly fuelRng: () => number;
  private coinCursor: number;
  private fuelCursor: number;
  // раздельные счётчики: id не зависит от паттерна вызовов planUpTo
  private coinSeq = 0;
  private fuelSeq = 0;

  constructor(
    seed: number,
    private readonly heightFn: HeightFn,
  ) {
    // независимые потоки PRNG, чтобы монеты не влияли на канистры
    this.coinRng = mulberry32((seed ^ 0x5eed_c01) | 0);
    this.fuelRng = mulberry32((seed ^ 0x5eed_f0e1) | 0);
    this.coinCursor = COIN_GROUPS.firstX;
    this.fuelCursor = FUEL_CANS.firstX;
  }

  /** Все новые пикапы с x до указанной границы (включая уже начатые группы). */
  planUpTo(x: number): Pickup[] {
    const out: Pickup[] = [];
    while (this.coinCursor < x) this.emitCoinGroup(out);
    while (this.fuelCursor < x) this.emitFuelCan(out);
    return out;
  }

  private emitCoinGroup(out: Pickup[]): void {
    const g = COIN_GROUPS;
    const size = g.sizeMin + Math.floor(this.coinRng() * (g.sizeMax - g.sizeMin + 1));
    const startX = this.coinCursor;

    // Бонусная дуга в ямах и на трамплинах: кривизна поверхности в центре группы.
    const centerX = startX + ((size - 1) * g.spacingM) / 2;
    const curvature = (this.heightFn(centerX - 3) + this.heightFn(centerX + 3)) / 2 - this.heightFn(centerX);
    const arcBoost = Math.min(Math.abs(curvature) * 0.6, g.arcBoostMaxM);

    for (let i = 0; i < size; i++) {
      const cx = startX + i * g.spacingM;
      const arc = size > 1 ? Math.sin((Math.PI * i) / (size - 1)) * arcBoost : 0;
      out.push({
        id: this.coinSeq++ * 2, // монеты — чётные id
        kind: 'coin',
        x: cx,
        y: this.heightFn(cx) - g.heightAboveM - arc, // Y вниз: минус = выше
      });
    }

    const gap = g.gapMin + this.coinRng() * (g.gapMax - g.gapMin);
    this.coinCursor = startX + (size - 1) * g.spacingM + gap;
  }

  private emitFuelCan(out: Pickup[]): void {
    const f = FUEL_CANS;
    const x = this.fuelCursor;
    out.push({
      id: this.fuelSeq++ * 2 + 1, // канистры — нечётные id
      kind: 'fuel',
      x,
      y: this.heightFn(x) - f.heightAboveM,
    });
    this.fuelCursor = x + f.intervalMeanM + (this.fuelRng() * 2 - 1) * f.intervalJitterM;
  }
}

/** Сенсорные тела пикапов в мире + стриминг и сбор. Без Phaser. */
export class PickupField {
  private readonly bodies = new Map<number, Body>();
  private readonly collectedQueue: Pickup[] = [];
  private spawnCb: ((p: Pickup) => void) | null = null;
  private removeCb: ((p: Pickup, collected: boolean) => void) | null = null;
  private collectCb: ((p: Pickup) => void) | null = null;

  private readonly onBeginContact = (contact: Contact): void => {
    const a = contact.getFixtureA();
    const b = contact.getFixtureB();
    const dataA = a.getUserData();
    const dataB = b.getUserData();
    const pickupData = isPickupFixtureData(dataA) ? dataA : isPickupFixtureData(dataB) ? dataB : null;
    if (!pickupData) return;
    const other = isPickupFixtureData(dataA) ? b : a;
    if (!other.getBody().isDynamic()) return;
    // Удалять тела внутри step нельзя — копим и обрабатываем в update().
    if (this.bodies.has(pickupData.pickup.id)) {
      this.collectedQueue.push(pickupData.pickup);
    }
  };

  constructor(
    private readonly world: World,
    private readonly planner: PickupPlanner,
    private readonly stream = PICKUP_STREAM,
  ) {
    world.on('begin-contact', this.onBeginContact);
  }

  onSpawn(cb: (p: Pickup) => void): void {
    this.spawnCb = cb;
  }

  onRemove(cb: (p: Pickup, collected: boolean) => void): void {
    this.removeCb = cb;
  }

  onCollect(cb: (p: Pickup) => void): void {
    this.collectCb = cb;
  }

  /** Вызывать после world.step: спавн вперёд, сбор, удаление позади. */
  update(carX: number): void {
    for (const pickup of this.planner.planUpTo(carX + this.stream.aheadM)) {
      this.spawn(pickup);
    }

    // Собранные на этом шаге.
    const seen = new Set<number>();
    while (this.collectedQueue.length > 0) {
      const pickup = this.collectedQueue.shift()!;
      if (seen.has(pickup.id)) continue;
      seen.add(pickup.id);
      this.despawn(pickup, true);
      this.collectCb?.(pickup);
    }

    // Несобранное далеко позади — удалить (тело и графику).
    for (const [, body] of this.bodies) {
      const pickup = (body.getFixtureList()!.getUserData() as PickupFixtureData).pickup;
      if (pickup.x < carX - this.stream.behindM) this.despawn(pickup, false);
    }
  }

  destroy(): void {
    this.world.off('begin-contact', this.onBeginContact);
    for (const [, body] of this.bodies) this.world.destroyBody(body);
    this.bodies.clear();
  }

  private spawn(pickup: Pickup): void {
    const body = this.world.createBody({ position: new Vec2(pickup.x, pickup.y) });
    const shape =
      pickup.kind === 'coin'
        ? new Circle(COIN_GROUPS.sensorRadiusM)
        : new Box(FUEL_CANS.sensorHalfW, FUEL_CANS.sensorHalfH);
    body.createFixture({
      shape,
      isSensor: true,
      userData: { type: 'pickup', pickup } satisfies PickupFixtureData,
    });
    this.bodies.set(pickup.id, body);
    this.spawnCb?.(pickup);
  }

  private despawn(pickup: Pickup, collected: boolean): void {
    const body = this.bodies.get(pickup.id);
    if (!body) return;
    this.world.destroyBody(body);
    this.bodies.delete(pickup.id);
    this.removeCb?.(pickup, collected);
  }
}
