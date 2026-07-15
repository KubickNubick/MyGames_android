/** Отрисовка пикапов: спрайты, при отсутствии — Graphics-placeholder. */
import Phaser from 'phaser';
import { PX_PER_M } from '../config';
import type { Pickup } from '../core/gameplay/pickups';
import { TEX, hasTexture } from './textures';

const COLOR_COIN = 0xffcd44;
const COLOR_COIN_INNER = 0xff8b30;
const COLOR_FUEL = 0xeb4334;
const COLOR_FUEL_CAP = 0x272a31;

const COIN_SIZE_M = 0.64;
const FUEL_SIZE_M = 0.85;
const DEPTH_PICKUP = -2;

export function drawPickup(scene: Phaser.Scene, pickup: Pickup): Phaser.GameObjects.GameObject {
  if (pickup.kind === 'coin' && hasTexture(scene, TEX.coin)) {
    const img = scene.add
      .image(pickup.x * PX_PER_M, pickup.y * PX_PER_M, TEX.coin)
      .setDisplaySize(COIN_SIZE_M * PX_PER_M, COIN_SIZE_M * PX_PER_M)
      .setDepth(DEPTH_PICKUP);
    // «вращение» монеты: сжатие по X, детерминированная фаза от позиции
    scene.tweens.add({
      targets: img,
      scaleX: img.scaleX * 0.25,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.abs(pickup.x * 137) % 500,
    });
    return img;
  }
  if (pickup.kind === 'fuel' && hasTexture(scene, TEX.fuel)) {
    return scene.add
      .image(pickup.x * PX_PER_M, pickup.y * PX_PER_M, TEX.fuel)
      .setDisplaySize(FUEL_SIZE_M * PX_PER_M, FUEL_SIZE_M * PX_PER_M)
      .setDepth(DEPTH_PICKUP);
  }

  // Placeholder из Graphics.
  const g = scene.add.graphics();
  g.setPosition(pickup.x * PX_PER_M, pickup.y * PX_PER_M);
  g.setDepth(DEPTH_PICKUP);
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

/** Удаление вида пикапа: гасим твины и уничтожаем объект. */
export function destroyPickupView(scene: Phaser.Scene, obj: Phaser.GameObjects.GameObject): void {
  scene.tweens.killTweensOf(obj);
  obj.destroy();
}
