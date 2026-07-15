/**
 * Параллакс-фон: небо + 2 слоя холмов (TileSprite) + облака.
 * Слои позиционируются вручную относительно камеры каждый кадр.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { StageVisuals } from '../data/stages';
import { TEX, hasTexture } from './textures';

const DEPTH_SKY = -100;
const DEPTH_CLOUDS = -95;
const DEPTH_HILLS_FAR = -90;
const DEPTH_HILLS_NEAR = -85;

/** Запас размеров под зум-аут камеры (минимальный зум 0.6). */
const OVERSCAN = 2.4;

const FAR_FACTOR = 0.12; // доля движения камеры
const NEAR_FACTOR = 0.3;
const CLOUD_FACTOR = 0.06;

export class Parallax {
  private readonly sky: Phaser.GameObjects.Image | null = null;
  private readonly hillsFar: Phaser.GameObjects.TileSprite | null = null;
  private readonly hillsNear: Phaser.GameObjects.TileSprite | null = null;
  private readonly clouds: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, visuals: StageVisuals) {
    const set = visuals.bgSet;

    if (visuals.useSkyTexture && hasTexture(scene, TEX.sky(set))) {
      this.sky = scene.add
        .image(0, 0, TEX.sky(set))
        .setDisplaySize(GAME_WIDTH * OVERSCAN, GAME_HEIGHT * OVERSCAN)
        .setDepth(DEPTH_SKY);
    }

    const makeHills = (
      key: string,
      color: number | null,
      depth: number,
    ): Phaser.GameObjects.TileSprite | null => {
      if (!hasTexture(scene, key)) return null;
      const ts = scene.add.tileSprite(0, 0, GAME_WIDTH * OVERSCAN, 320, key);
      ts.setOrigin(0.5, 1);
      ts.setDepth(depth);
      if (color !== null) ts.setTintFill(color);
      return ts;
    };
    this.hillsFar = makeHills(TEX.hillsFar(set), visuals.hillsFarColor, DEPTH_HILLS_FAR);
    this.hillsNear = makeHills(TEX.hillsNear(set), visuals.hillsNearColor, DEPTH_HILLS_NEAR);

    if (visuals.cloudsVisible) {
      for (const n of [1, 2, 3]) {
        const key = TEX.cloud(set, n);
        if (!hasTexture(scene, key)) continue;
        const cloud = scene.add.image(0, 0, key).setDepth(DEPTH_CLOUDS).setAlpha(0.95);
        cloud.setScale(0.9 + n * 0.25);
        this.clouds.push(cloud);
      }
    }
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, timeMs: number): void {
    const mx = cam.midPoint.x;
    const my = cam.midPoint.y;

    this.sky?.setPosition(mx, my - GAME_HEIGHT * 0.18);

    if (this.hillsFar) {
      this.hillsFar.setPosition(mx, my * 0.25 + 230);
      this.hillsFar.tilePositionX = mx * (1 - FAR_FACTOR);
    }
    if (this.hillsNear) {
      this.hillsNear.setPosition(mx, my * 0.18 + 330);
      this.hillsNear.tilePositionX = mx * (1 - NEAR_FACTOR);
    }

    const wrapW = GAME_WIDTH * OVERSCAN;
    this.clouds.forEach((cloud, i) => {
      const drift = timeMs * 0.008 * (1 + i * 0.35);
      const base = i * (wrapW / 3) + drift - mx * (1 - CLOUD_FACTOR);
      const rel = Phaser.Math.Wrap(base, -wrapW / 2, wrapW / 2);
      cloud.setPosition(mx + rel, my * 0.2 - 210 + i * 55);
    });
  }

  destroy(): void {
    this.sky?.destroy();
    this.hillsFar?.destroy();
    this.hillsNear?.destroy();
    for (const c of this.clouds) c.destroy();
  }
}
