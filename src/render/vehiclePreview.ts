/** Статичное превью машины для гаража (Graphics, до ассетов фазы 5). */
import Phaser from 'phaser';
import type { VehicleParams } from '../data/vehicles';

const COLOR_CHASSIS = 0xeb4334;
const COLOR_HEAD = 0xffd7a8;
const COLOR_WHEEL = 0x272a31;
const COLOR_SPOKE = 0x94623a;
const COLOR_GROUND = 0x68b54c;

export function drawVehiclePreview(
  scene: Phaser.Scene,
  params: VehicleParams,
  cx: number,
  cy: number,
  pxPerM = 90,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setPosition(cx, cy);

  const groundY = (params.axles.rear.y + params.wheel.radius) * pxPerM;
  g.lineStyle(4, COLOR_GROUND);
  g.lineBetween(-1.8 * pxPerM, groundY, 1.8 * pxPerM, groundY);

  g.fillStyle(COLOR_CHASSIS);
  g.fillRoundedRect(
    -params.chassis.halfWidth * pxPerM,
    -params.chassis.halfHeight * pxPerM,
    params.chassis.halfWidth * 2 * pxPerM,
    params.chassis.halfHeight * 2 * pxPerM,
    8,
  );
  g.fillStyle(COLOR_HEAD);
  g.fillCircle(params.head.x * pxPerM, params.head.y * pxPerM, params.head.radius * pxPerM);

  for (const axle of [params.axles.rear, params.axles.front]) {
    const r = params.wheel.radius * pxPerM;
    g.fillStyle(COLOR_WHEEL);
    g.fillCircle(axle.x * pxPerM, axle.y * pxPerM, r);
    g.lineStyle(3, COLOR_SPOKE);
    g.strokeCircle(axle.x * pxPerM, axle.y * pxPerM, r * 0.55);
  }
  return g;
}
