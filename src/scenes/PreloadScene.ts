import Phaser from 'phaser';
import type { DebugParams } from '../config';

/**
 * Preload: загрузка ассетов. Пока (фаза 0) грузить нечего —
 * реальная загрузка по docs/ASSETS.md появится в фазе 5.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;
    this.scene.start(debug.scene === 'garage' ? 'Garage' : 'Game');
  }
}
