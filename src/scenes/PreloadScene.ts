import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { DebugParams } from '../config';
import { TEX } from '../render/textures';
import { AUDIO_KEYS } from '../audio/gameAudio';

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
    this.load.image('ui_logo', 'assets/ui/logo.png');
    this.load.image('btn_gas', 'assets/ui/btn_gas.png');
    this.load.image('btn_brake', 'assets/ui/btn_brake.png');
    this.load.image('fx_dust', 'assets/fx/dust.png');
    this.load.image('fx_smoke', 'assets/fx/smoke.png');

    this.load.audio(AUDIO_KEYS.engine, 'assets/audio/engine_loop.wav');
    this.load.audio(AUDIO_KEYS.coin, 'assets/audio/coin.wav');
    this.load.audio(AUDIO_KEYS.flip, 'assets/audio/flip.wav');
    this.load.audio(AUDIO_KEYS.death, 'assets/audio/death.wav');
    this.load.audio(AUDIO_KEYS.fuel, 'assets/audio/fuel.wav');
    this.load.audio(AUDIO_KEYS.music, 'assets/audio/music_loop.wav');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;
    // авто-газ (headless-скриншоты) идёт сразу в игру, минуя меню
    if (debug.scene === 'garage') this.scene.start('Garage');
    else if (debug.scene === 'game' || debug.autoGas) this.scene.start('Game');
    else this.scene.start('Menu');
  }
}
