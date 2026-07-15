import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { hasTexture } from '../render/textures';

const LOGO_KEY = 'ui_logo';

/** Главное меню: логотип + Играть / Гараж. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor('#49a6e0');

    if (hasTexture(this, LOGO_KEY)) {
      this.add.image(cx, 190, LOGO_KEY).setDisplaySize(640, 160);
    } else {
      this.add
        .text(cx, 190, 'HILL RACER', { fontFamily: 'monospace', fontSize: '72px', color: '#ffffff' })
        .setOrigin(0.5);
    }

    this.makeButton(cx, 400, 'ИГРАТЬ ▶', () => this.scene.start('Game'));
    this.makeButton(cx, 490, 'ГАРАЖ', () => this.scene.start('Garage'));

    this.add
      .text(cx, GAME_HEIGHT - 40, 'Газ — D/→/правая половина · Тормоз — A/←/левая · P — пауза', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e8f4ff',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('Game'));
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('Game'));
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 300, 64, 0x68b54c)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x7fce5f));
    bg.on('pointerout', () => bg.setFillStyle(0x68b54c));
    bg.on('pointerdown', onClick);
  }
}
