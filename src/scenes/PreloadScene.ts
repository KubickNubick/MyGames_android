import Phaser from 'phaser';

/**
 * Preload: загрузка ассетов. Пока (фаза 0) грузить нечего —
 * реальная загрузка по docs/ASSETS.md появится в фазе 5.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    this.scene.start('Game');
  }
}
