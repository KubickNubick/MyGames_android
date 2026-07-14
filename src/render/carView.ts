/**
 * Отрисовка машины Graphics-примитивами (до ассетов фазы 5).
 * Единственное место конверсии метры → пиксели вместе с остальным src/render/.
 */
import Phaser from 'phaser';
import { PX_PER_M } from '../config';
import type { Car, WheelKey } from '../core/physics/car';

const COLOR_CHASSIS = 0xeb4334;
const COLOR_HEAD = 0xffd7a8;
const COLOR_WHEEL = 0x272a31;
const COLOR_SPOKE = 0x94623a;

export class CarView {
  private readonly chassisG: Phaser.GameObjects.Graphics;
  private readonly wheelG: Record<WheelKey, Phaser.GameObjects.Graphics>;

  constructor(
    scene: Phaser.Scene,
    private readonly car: Car,
  ) {
    const p = car.params;

    this.chassisG = scene.add.graphics();
    this.chassisG.fillStyle(COLOR_CHASSIS);
    this.chassisG.fillRoundedRect(
      -p.chassis.halfWidth * PX_PER_M,
      -p.chassis.halfHeight * PX_PER_M,
      p.chassis.halfWidth * 2 * PX_PER_M,
      p.chassis.halfHeight * 2 * PX_PER_M,
      6,
    );
    // Голова водителя (визуализация сенсора).
    this.chassisG.fillStyle(COLOR_HEAD);
    this.chassisG.fillCircle(p.head.x * PX_PER_M, p.head.y * PX_PER_M, p.head.radius * PX_PER_M);

    const makeWheel = (): Phaser.GameObjects.Graphics => {
      const g = scene.add.graphics();
      const r = p.wheel.radius * PX_PER_M;
      g.fillStyle(COLOR_WHEEL);
      g.fillCircle(0, 0, r);
      g.lineStyle(3, COLOR_SPOKE);
      g.lineBetween(0, 0, r * 0.85, 0); // спица — видно вращение
      g.strokeCircle(0, 0, r * 0.55);
      return g;
    };
    this.wheelG = { rear: makeWheel(), front: makeWheel() };
  }

  update(): void {
    const ch = this.car.chassis;
    this.chassisG.setPosition(ch.getPosition().x * PX_PER_M, ch.getPosition().y * PX_PER_M);
    this.chassisG.setRotation(ch.getAngle());

    for (const key of ['rear', 'front'] as const) {
      const w = this.car.wheels[key];
      this.wheelG[key].setPosition(w.getPosition().x * PX_PER_M, w.getPosition().y * PX_PER_M);
      this.wheelG[key].setRotation(w.getAngle());
    }
  }

  destroy(): void {
    this.chassisG.destroy();
    this.wheelG.rear.destroy();
    this.wheelG.front.destroy();
  }
}
