/**
 * Отрисовка машины: спрайты «Bumpy Buddy» (якоря из data/sprites.ts),
 * при отсутствии текстур — Graphics-placeholder.
 * Голова водителя — чисто визуальная «пружинка» от ускорения, без физики.
 */
import Phaser from 'phaser';
import { PX_PER_M } from '../config';
import type { Car, WheelKey } from '../core/physics/car';
import { JEEP_BODY, DRIVER_HEAD } from '../data/sprites';
import { TEX, hasTexture } from './textures';

const COLOR_CHASSIS = 0xeb4334;
const COLOR_HEAD = 0xffd7a8;
const COLOR_WHEEL = 0x272a31;
const COLOR_SPOKE = 0x94623a;

const DEPTH_HEAD = 4;
const DEPTH_BODY = 5;
const DEPTH_WHEEL = 6;

/** Размер спрайта головы, м (96 px при 256 px/м). */
const HEAD_SIZE_M = 96 / JEEP_BODY.srcPxPerM;
/** Ограничение хода «пружинки» головы, м. */
const HEAD_TRAVEL_M = 0.09;
const HEAD_ACCEL_TO_OFFSET = 0.004; // м смещения на м/с² ускорения
const HEAD_SMOOTHING = 8; // 1/с, скорость сглаживания

type BodyLike = Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;

export class CarView {
  private readonly body: BodyLike;
  private readonly head: BodyLike;
  private readonly wheels: Record<WheelKey, BodyLike>;
  private prevVx = 0;
  private prevVy = 0;
  private headOffsetX = 0;
  private headOffsetY = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly car: Car,
  ) {
    const p = car.params;

    if (hasTexture(scene, TEX.jeepBody)) {
      this.body = scene.add
        .image(0, 0, TEX.jeepBody)
        .setDisplaySize(JEEP_BODY.lengthM * PX_PER_M, JEEP_BODY.heightM * PX_PER_M);
    } else {
      const g = scene.add.graphics();
      g.fillStyle(COLOR_CHASSIS);
      g.fillRoundedRect(
        -p.chassis.halfWidth * PX_PER_M,
        -p.chassis.halfHeight * PX_PER_M,
        p.chassis.halfWidth * 2 * PX_PER_M,
        p.chassis.halfHeight * 2 * PX_PER_M,
        6,
      );
      this.body = g;
    }
    this.body.setDepth(DEPTH_BODY);

    if (hasTexture(scene, TEX.driverHead)) {
      this.head = scene.add
        .image(0, 0, TEX.driverHead)
        .setDisplaySize(HEAD_SIZE_M * PX_PER_M, HEAD_SIZE_M * PX_PER_M);
    } else {
      const g = scene.add.graphics();
      g.fillStyle(COLOR_HEAD);
      g.fillCircle(0, 0, p.head.radius * PX_PER_M);
      this.head = g;
    }
    this.head.setDepth(DEPTH_HEAD);

    const makeWheel = (): BodyLike => {
      const r = p.wheel.radius * PX_PER_M;
      if (hasTexture(scene, TEX.jeepWheel)) {
        return scene.add
          .image(0, 0, TEX.jeepWheel)
          .setDisplaySize(r * 2, r * 2)
          .setDepth(DEPTH_WHEEL);
      }
      const g = scene.add.graphics();
      g.fillStyle(COLOR_WHEEL);
      g.fillCircle(0, 0, r);
      g.lineStyle(3, COLOR_SPOKE);
      g.lineBetween(0, 0, r * 0.85, 0);
      g.strokeCircle(0, 0, r * 0.55);
      return g.setDepth(DEPTH_WHEEL);
    };
    this.wheels = { rear: makeWheel(), front: makeWheel() };
  }

  update(deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const ch = this.car.chassis;
    const pos = ch.getPosition();
    const angle = ch.getAngle();

    this.body.setPosition(pos.x * PX_PER_M, pos.y * PX_PER_M);
    this.body.setRotation(angle);

    // «Пружинка» головы: смещение против сглаженного ускорения.
    const v = ch.getLinearVelocity();
    const ax = dt > 0 ? (v.x - this.prevVx) / dt : 0;
    const ay = dt > 0 ? (v.y - this.prevVy) / dt : 0;
    this.prevVx = v.x;
    this.prevVy = v.y;
    const k = Math.min(1, HEAD_SMOOTHING * dt);
    const clamp = (val: number) => Phaser.Math.Clamp(val, -HEAD_TRAVEL_M, HEAD_TRAVEL_M);
    this.headOffsetX += (clamp(-ax * HEAD_ACCEL_TO_OFFSET) - this.headOffsetX) * k;
    this.headOffsetY += (clamp(-ay * HEAD_ACCEL_TO_OFFSET) - this.headOffsetY) * k;

    const localX = DRIVER_HEAD.anchor.x + this.headOffsetX;
    const localY = DRIVER_HEAD.anchor.y + this.headOffsetY;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.head.setPosition(
      (pos.x + localX * cos - localY * sin) * PX_PER_M,
      (pos.y + localX * sin + localY * cos) * PX_PER_M,
    );
    this.head.setRotation(angle);

    for (const key of ['rear', 'front'] as const) {
      const w = this.car.wheels[key];
      this.wheels[key].setPosition(w.getPosition().x * PX_PER_M, w.getPosition().y * PX_PER_M);
      this.wheels[key].setRotation(w.getAngle());
    }
  }

  destroy(): void {
    this.body.destroy();
    this.head.destroy();
    this.wheels.rear.destroy();
    this.wheels.front.destroy();
  }
}
