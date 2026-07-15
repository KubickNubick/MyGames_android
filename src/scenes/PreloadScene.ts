import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { DebugParams } from '../config';
import { TEX } from '../render/textures';

/**
 * Preload: загрузка ассетов по docs/ASSETS.md.
 * Отсутствующий файл — не ошибка: рендер подставит placeholder из Graphics.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const barBg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 22, 0x272a31)
      .setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 208, GAME_HEIGHT / 2, 0, 14, 0x68b54c).setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => bar.setSize(416 * v, 14));
    this.load.on('complete', () => {
      bar.destroy();
      barBg.destroy();
    });
    // не валимся на отсутствующих файлах
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`asset missing: ${file.key} (${file.url}) — placeholder`);
    });

    const set = 'countryside'; // единственный готовый набор текстур
    this.load.image(TEX.jeepBody, 'assets/vehicles/jeep/body.png');
    this.load.image(TEX.jeepWheel, 'assets/vehicles/jeep/wheel.png');
    this.load.image(TEX.driverHead, 'assets/driver/head.png');
    this.load.image(TEX.ground(set), `assets/terrain/${set}/ground.png`);
    this.load.image(TEX.surface(set), `assets/terrain/${set}/surface.png`);
    this.load.image(TEX.sky(set), `assets/bg/${set}/sky.png`);
    this.load.image(TEX.hillsFar(set), `assets/bg/${set}/hills_far.png`);
    this.load.image(TEX.hillsNear(set), `assets/bg/${set}/hills_near.png`);
    for (const n of [1, 2, 3]) this.load.image(TEX.cloud(set, n), `assets/bg/${set}/cloud_${n}.png`);
    this.load.image(TEX.coin, 'assets/pickups/coin.png');
    this.load.image(TEX.fuel, 'assets/pickups/fuel.png');
    this.load.image(TEX.iconCoin, 'assets/ui/icon_coin.png');
    this.load.image(TEX.iconFuel, 'assets/ui/icon_fuel.png');
    this.load.image(TEX.iconDistance, 'assets/ui/icon_distance.png');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;
    this.scene.start(debug.scene === 'garage' ? 'Garage' : 'Game');
  }
}
