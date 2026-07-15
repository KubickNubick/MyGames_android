/**
 * Отрисовка рельефа. Чанк = RenderTexture: тайл грунта, обрезанный по кривой
 * поверхности (запекается один раз), + полоса поверхности с кромкой.
 * Нет текстуры — fallback на заливку цветом (placeholder).
 */
import Phaser from 'phaser';
import { PX_PER_M } from '../config';
import type { Point2 } from '../data/vehicles';
import type { StageVisuals } from '../data/stages';
import { TERRAIN_COUNTRYSIDE } from '../data/sprites';
import { TEX, hasTexture } from './textures';

const GROUND_DEPTH_M = 20;
/** Запекаем RT в половинном разрешении — грунту хватает, VRAM ×4 меньше. */
const BAKE_SCALE = 0.5;
/** px исходника ground.png на метр (512 px = 4 м). */
const GROUND_SRC_PX_PER_M = 128;

const DEPTH_GROUND = -20;
const DEPTH_SURFACE = -15;

export class TerrainChunkView {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  /**
   * @param points точки поверхности чанка (с шагом сетки)
   * @param edgeBefore/edgeAfter дополнительные точки за границами чанка —
   *        продолжение полосы поверхности без швов на стыках
   */
  constructor(
    scene: Phaser.Scene,
    points: Point2[],
    visuals: StageVisuals,
    edgeBefore: Point2 | null,
    edgeAfter: Point2 | null,
  ) {
    const groundKey = TEX.ground(visuals.terrainSet);
    if (hasTexture(scene, groundKey)) {
      this.objects.push(this.bakeGround(scene, points, groundKey, visuals.groundTint));
    } else {
      this.objects.push(this.fallbackGround(scene, points, visuals));
    }
    this.objects.push(this.drawSurfaceBand(scene, points, visuals, edgeBefore, edgeAfter));
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
  }

  /** RT: тайл грунта на всю площадь чанка, минус область неба над кривой. */
  private bakeGround(
    scene: Phaser.Scene,
    points: Point2[],
    groundKey: string,
    tint: number,
  ): Phaser.GameObjects.RenderTexture {
    const startX = points[0].x;
    const endX = points[points.length - 1].x;
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y)) + GROUND_DEPTH_M;

    const wPx = (endX - startX) * PX_PER_M;
    const hPx = (maxY - minY) * PX_PER_M;
    const rt = scene.add.renderTexture(
      startX * PX_PER_M,
      minY * PX_PER_M,
      wPx * BAKE_SCALE,
      hPx * BAKE_SCALE,
    );
    rt.setOrigin(0, 0);
    rt.setScale(1 / BAKE_SCALE);
    rt.setDepth(DEPTH_GROUND);

    // Тайл грунта: 512 px = 4 м; выравнивание по мировым координатам,
    // чтобы стыки чанков сходились пиксель-в-пиксель.
    const tileScale = (PX_PER_M / GROUND_SRC_PX_PER_M) * BAKE_SCALE;
    const tile = scene.make.tileSprite(
      { x: 0, y: 0, width: rt.width, height: rt.height, key: groundKey },
      false,
    );
    tile.setOrigin(0, 0);
    tile.setTileScale(tileScale, tileScale);
    tile.tilePositionX = (startX * PX_PER_M * BAKE_SCALE) / tileScale;
    tile.tilePositionY = (minY * PX_PER_M * BAKE_SCALE) / tileScale;
    tile.setTint(tint);
    rt.draw(tile, 0, 0);
    tile.destroy();

    // Срезаем небо: полигон выше кривой поверхности.
    const sky = scene.make.graphics({}, false);
    sky.fillStyle(0xffffff);
    sky.beginPath();
    const px = (p: Point2) => ({
      x: (p.x - startX) * PX_PER_M * BAKE_SCALE,
      y: (p.y - minY) * PX_PER_M * BAKE_SCALE,
    });
    const first = px(points[0]);
    sky.moveTo(first.x, -8);
    for (const p of points) {
      const q = px(p);
      sky.lineTo(q.x, q.y);
    }
    const last = px(points[points.length - 1]);
    sky.lineTo(last.x, -8);
    sky.closePath();
    sky.fillPath();
    rt.erase(sky);
    sky.destroy();

    return rt;
  }

  /** Placeholder без текстуры: сплошная заливка вниз. */
  private fallbackGround(
    scene: Phaser.Scene,
    points: Point2[],
    visuals: StageVisuals,
  ): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    g.setDepth(DEPTH_GROUND);
    const tint = visuals.groundTint === 0xffffff ? 0x94623a : visuals.groundTint;
    g.fillStyle(tint);
    g.beginPath();
    g.moveTo(points[0].x * PX_PER_M, points[0].y * PX_PER_M);
    for (const p of points) g.lineTo(p.x * PX_PER_M, p.y * PX_PER_M);
    g.lineTo(
      points[points.length - 1].x * PX_PER_M,
      (points[points.length - 1].y + GROUND_DEPTH_M) * PX_PER_M,
    );
    g.lineTo(points[0].x * PX_PER_M, (points[0].y + GROUND_DEPTH_M) * PX_PER_M);
    g.closePath();
    g.fillPath();
    return g;
  }

  /** Полоса поверхности: основная лента + тонкая кромка сверху. */
  private drawSurfaceBand(
    scene: Phaser.Scene,
    points: Point2[],
    visuals: StageVisuals,
    edgeBefore: Point2 | null,
    edgeAfter: Point2 | null,
  ): Phaser.GameObjects.Graphics {
    const path: Point2[] = [
      ...(edgeBefore ? [edgeBefore] : []),
      ...points,
      ...(edgeAfter ? [edgeAfter] : []),
    ];
    const g = scene.add.graphics();
    g.setDepth(DEPTH_SURFACE);

    const stroke = (widthM: number, color: number, offsetM: number) => {
      g.lineStyle(widthM * PX_PER_M, color);
      g.beginPath();
      g.moveTo(path[0].x * PX_PER_M, (path[0].y + offsetM) * PX_PER_M);
      for (const p of path.slice(1)) g.lineTo(p.x * PX_PER_M, (p.y + offsetM) * PX_PER_M);
      g.strokePath();
    };
    const thickness = TERRAIN_COUNTRYSIDE.surfaceThicknessM;
    stroke(thickness * 0.75, visuals.surfaceBand[0], thickness * 0.18); // основная лента
    stroke(thickness * 0.22, visuals.surfaceBand[1], -thickness * 0.05); // кромка
    return g;
  }
}
