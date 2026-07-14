/** Отрисовка пикапов Graphics-примитивами (текстуры — в фазе 5). */
import Phaser from 'phaser';
import { PX_PER_M } from '../config';
import type { Pickup } from '../core/gameplay/pickups';

const COLOR_COIN = 0xffcd44;
const COLOR_COIN_INNER = 0xff8b30;
const COLOR_FUEL = 0xeb4334;
const COLOR_FUEL_CAP = 0x272a31;

export function drawPickup(scene: Phaser.Scene, pickup: Pickup): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setPosition(pickup.x * PX_PER_M, pickup.y * PX_PER_M);
  if (pickup.kind === 'coin') {
    const r = 0.32 * PX_PER_M;
    g.fillStyle(COLOR_COIN);
    g.fillCircle(0, 0, r);
    g.fillStyle(COLOR_COIN_INNER);
    g.fillCircle(0, 0, r * 0.55);
  } else {
    const w = 0.6 * PX_PER_M;
    const h = 0.8 * PX_PER_M;
    g.fillStyle(COLOR_FUEL);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    g.fillStyle(COLOR_FUEL_CAP);
    g.fillRect(-w * 0.18, -h / 2 - 4, w * 0.36, 6);
  }
  return g;
}
