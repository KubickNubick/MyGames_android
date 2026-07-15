import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { EndReason } from '../core/gameplay/run';

export interface ResultsData {
  distance: number;
  coins: number;
  reason: EndReason;
  isRecord: boolean;
  balance: number;
}

/** Экран результатов заезда: дистанция, монеты, причина, Restart / Garage. */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(data: ResultsData): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x272a31, 0.55);
    this.add.rectangle(cx, cy, 560, 420, 0x272a31, 0.95).setStrokeStyle(3, 0xffcd44);

    const reasonText = data.reason === 'crash' ? 'Водитель разбился' : 'Кончилось топливо';
    this.add
      .text(cx, cy - 160, 'ЗАЕЗД ОКОНЧЕН', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 112, reasonText, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#eb4334',
      })
      .setOrigin(0.5);

    const recordSuffix = data.isRecord ? '  ★ РЕКОРД!' : '';
    this.add
      .text(cx, cy - 45, `Дистанция   ${Math.floor(data.distance)} м${recordSuffix}`, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: data.isRecord ? '#ffcd44' : '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy, `Монеты      ● ${data.coins}`, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffcd44',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 42, `Баланс      ● ${data.balance}`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.makeButton(cx - 130, cy + 130, 'ЗАНОВО (R)', () => this.restartRun());
    this.makeButton(cx + 130, cy + 130, 'ГАРАЖ (G)', () => this.goGarage());

    this.input.keyboard?.on('keydown-R', () => this.restartRun());
    this.input.keyboard?.on('keydown-G', () => this.goGarage());
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 220, 56, 0x68b54c)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x7fce5f));
    bg.on('pointerout', () => bg.setFillStyle(0x68b54c));
    bg.on('pointerdown', onClick);
  }

  private restartRun(): void {
    const game = this.scene.get('Game');
    this.scene.stop();
    game.scene.restart();
  }

  private goGarage(): void {
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Garage');
  }
}
