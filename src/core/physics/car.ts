/**
 * Машина: шасси + 2 колеса на WheelJoint (подвеска-пружина + мотор).
 * Чистый модуль без Phaser (инвариант №3), тестируется в Node.
 *
 * Система координат: метры, ось Y вниз. Движение «вперёд» = +X,
 * что соответствует положительной угловой скорости колеса.
 * «Нос вверх» (backflip) = отрицательный угловой момент.
 */
import { type World, type Body, type Fixture, type Contact, Vec2, Box, Circle, WheelJoint } from 'planck';
import type { VehicleParams, Point2 } from '../../data/vehicles';
import { isTerrainFixtureData } from './terrainBody';

export type DriveInput = 'gas' | 'brake' | 'none';

export type WheelKey = 'rear' | 'front';

export interface Car {
  readonly chassis: Body;
  readonly wheels: Record<WheelKey, Body>;
  readonly joints: Record<WheelKey, WheelJoint>;
  readonly params: VehicleParams;
  readonly dead: boolean;
  /** Текущий ввод; применяется в step(). */
  setInput(input: DriveInput): void;
  getInput(): DriveInput;
  /** Оба колеса в воздухе? */
  isAirborne(): boolean;
  isWheelOnGround(key: WheelKey): boolean;
  /** Скорость шасси вдоль X, м/с. */
  getForwardSpeed(): number;
  /** Вызывать на КАЖДОМ fixed step ДО world.step(). */
  step(): void;
  onDeath(cb: () => void): void;
  destroy(): void;
}

export function createCar(world: World, params: VehicleParams, spawn: Point2): Car {
  const chassis = world.createDynamicBody({ position: new Vec2(spawn.x, spawn.y) });
  chassis.createFixture({
    shape: new Box(params.chassis.halfWidth, params.chassis.halfHeight),
    density: params.chassis.density,
    friction: params.chassis.friction,
  });

  // Сенсор головы водителя: контакт с рельефом = смерть.
  const headFixture = chassis.createFixture({
    shape: new Circle(new Vec2(params.head.x, params.head.y), params.head.radius),
    isSensor: true,
  });

  function makeWheel(axle: Point2): { body: Body; joint: WheelJoint; fixture: Fixture } {
    const pos = new Vec2(spawn.x + axle.x, spawn.y + axle.y);
    const body = world.createDynamicBody({ position: pos });
    const fixture = body.createFixture({
      shape: new Circle(params.wheel.radius),
      density: params.wheel.density,
      friction: params.wheel.friction,
    });
    const joint = new WheelJoint(
      {
        enableMotor: true,
        motorSpeed: 0,
        maxMotorTorque: params.rollingResistanceTorque,
        frequencyHz: params.suspension.frequencyHz,
        dampingRatio: params.suspension.dampingRatio,
      },
      chassis,
      body,
      pos,
      new Vec2(0, 1), // ось подвески — вертикаль
    );
    world.createJoint(joint);
    return { body, joint, fixture };
  }

  const rear = makeWheel(params.axles.rear);
  const front = makeWheel(params.axles.front);

  const wheelFixtures = new Map<Fixture, WheelKey>([
    [rear.fixture, 'rear'],
    [front.fixture, 'front'],
  ]);
  const groundContacts: Record<WheelKey, number> = { rear: 0, front: 0 };

  let input: DriveInput = 'none';
  let dead = false;
  const deathCallbacks: Array<() => void> = [];

  function contactPair(contact: Contact): { wheel: WheelKey | null; head: boolean; terrain: boolean } {
    const a = contact.getFixtureA();
    const b = contact.getFixtureB();
    const terrain = isTerrainFixtureData(a.getUserData()) || isTerrainFixtureData(b.getUserData());
    const wheel = wheelFixtures.get(a) ?? wheelFixtures.get(b) ?? null;
    const head = a === headFixture || b === headFixture;
    return { wheel, head, terrain };
  }

  const onBeginContact = (contact: Contact): void => {
    const { wheel, head, terrain } = contactPair(contact);
    if (!terrain) return;
    if (wheel) groundContacts[wheel]++;
    if (head && !dead) {
      dead = true;
      for (const cb of deathCallbacks) cb();
    }
  };

  const onEndContact = (contact: Contact): void => {
    const { wheel, terrain } = contactPair(contact);
    if (!terrain) return;
    if (wheel) groundContacts[wheel] = Math.max(0, groundContacts[wheel] - 1);
  };

  world.on('begin-contact', onBeginContact);
  world.on('end-contact', onEndContact);

  function setMotor(joint: WheelJoint, speed: number, torque: number): void {
    joint.setMotorSpeed(speed);
    joint.setMaxMotorTorque(torque);
  }

  /** Раздача торка: заднее колесо всегда, переднее — при 4WD со своей долей. */
  function drive(speed: number, torque: number): void {
    setMotor(rear.joint, speed, torque);
    if (params.fourWheelDrive) {
      setMotor(front.joint, speed, torque * params.frontTorqueShare);
    } else {
      setMotor(front.joint, 0, params.rollingResistanceTorque);
    }
  }

  const car: Car = {
    chassis,
    wheels: { rear: rear.body, front: front.body },
    joints: { rear: rear.joint, front: front.joint },
    params,
    get dead() {
      return dead;
    },
    setInput(next) {
      input = next;
    },
    getInput() {
      return input;
    },
    isAirborne() {
      return groundContacts.rear === 0 && groundContacts.front === 0;
    },
    isWheelOnGround(key) {
      return groundContacts[key] > 0;
    },
    getForwardSpeed() {
      return chassis.getLinearVelocity().x;
    },
    step() {
      if (dead) {
        setMotor(rear.joint, 0, params.rollingResistanceTorque);
        setMotor(front.joint, 0, params.rollingResistanceTorque);
        return;
      }

      // Управление в воздухе: газ — нос вверх (backflip), тормоз — нос вниз (frontflip).
      // Реакция от раскрутки колёс добавляется «бесплатно» самим мотором.
      if (this.isAirborne()) {
        if (input === 'gas') chassis.applyTorque(-params.airTorque);
        else if (input === 'brake') chassis.applyTorque(params.airTorque);
      }

      switch (input) {
        case 'gas':
          drive(params.engine.maxWheelSpeed, params.engine.torque);
          break;
        case 'brake': {
          if (this.getForwardSpeed() > params.brake.reverseBelowSpeed) {
            // Торможение: мотор к нулю с высоким торком на оба колеса.
            setMotor(rear.joint, 0, params.brake.torque);
            setMotor(front.joint, 0, params.brake.torque);
          } else {
            // Почти остановились — задний ход (медленнее).
            drive(-params.engine.maxWheelSpeed * params.brake.reverseSpeedFactor, params.engine.torque);
          }
          break;
        }
        case 'none':
          // Свободный накат со слабым сопротивлением качению.
          setMotor(rear.joint, 0, params.rollingResistanceTorque);
          setMotor(front.joint, 0, params.rollingResistanceTorque);
          break;
      }
    },
    onDeath(cb) {
      deathCallbacks.push(cb);
    },
    destroy() {
      world.off('begin-contact', onBeginContact);
      world.off('end-contact', onEndContact);
      world.destroyJoint(rear.joint);
      world.destroyJoint(front.joint);
      world.destroyBody(rear.body);
      world.destroyBody(front.body);
      world.destroyBody(chassis);
    },
  };
  return car;
}
