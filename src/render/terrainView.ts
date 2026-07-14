/**
 * Отрисовка рельефа: заливка грунта вниз от линии поверхности + препятствия.
 * Текстуры — в фазе 5, пока цвета из палитры проекта.
 */
import Phaser from 'phaser';
import { PX_PER_M } from '../config';
import type { Point2 } from '../data/vehicles';

const COLOR_SOIL = 0x94623a;
const COLOR_GRASS = 0x68b54c;
const GROUND_DEPTH_M = 30;

/** Залитый грунт с полосой «травы» по кривой поверхности. */
export function drawGround(scene: Phaser.Scene, points: Point2[]): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const px = points.map((p) => ({ x: p.x * PX_PER_M, y: p.y * PX_PER_M }));

  g.fillStyle(COLOR_SOIL);
  g.beginPath();
  g.moveTo(px[0].x, px[0].y);
  for (const p of px) g.lineTo(p.x, p.y);
  g.lineTo(px[px.length - 1].x, px[px.length - 1].y + GROUND_DEPTH_M * PX_PER_M);
  g.lineTo(px[0].x, px[0].y + GROUND_DEPTH_M * PX_PER_M);
  g.closePath();
  g.fillPath();

  g.lineStyle(0.35 * PX_PER_M, COLOR_GRASS);
  g.beginPath();
  g.moveTo(px[0].x, px[0].y);
  for (const p of px) g.lineTo(p.x, p.y);
  g.strokePath();

  return g;
}

/** Статический бокс-препятствие (в тех же координатах, что физика). */
export function drawBox(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(COLOR_SOIL);
  g.fillRect(
    (cx - halfWidth) * PX_PER_M,
    (cy - halfHeight) * PX_PER_M,
    halfWidth * 2 * PX_PER_M,
    halfHeight * 2 * PX_PER_M,
  );
  g.lineStyle(3, COLOR_GRASS);
  g.strokeRect(
    (cx - halfWidth) * PX_PER_M,
    (cy - halfHeight) * PX_PER_M,
    halfWidth * 2 * PX_PER_M,
    halfHeight * 2 * PX_PER_M,
  );
  return g;
}
