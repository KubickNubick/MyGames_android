import Phaser from 'phaser';
import { parseDebugParams, type DebugParams } from '../config';

/** Boot: парсит URL-параметры отладки и передаёт их дальше по цепочке сцен. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const debug: DebugParams = parseDebugParams(window.location.search);
    this.registry.set('debug', debug);
    this.scene.start('Preload');
  }
}
