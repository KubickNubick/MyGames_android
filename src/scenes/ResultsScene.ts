import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { EndReason } from '../core/gameplay/run';

export interface ResultsData {
  distance: number;
  coins: number;
  reason: EndReason;
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
    this.add.rectangle(cx, cy, 560, 400, 0x272a31, 0.95).setStrokeStyle(3, 0xffcd44);

    const reasonText = data.reason === 'crash' ? 'Водитель разбился' : 'Кончилось топливо';
    this.add
      .text(cx, cy - 150, 'ЗАЕЗД ОКОНЧЕН', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 100, reasonText, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#eb4334',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 30, `Дистанция   ${Math.floor(data.distance)} м`, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 15, `Монеты      ● ${data.coins}`, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffcd44',
      })
      .setOrigin(0.5);

    this.makeButton(cx - 130, cy + 120, 'ЗАНОВО (R)', true, () => this.restartRun());
    this.makeButton(cx + 130, cy + 120, 'ГАРАЖ', false, () => {});

    this.input.keyboard?.on('keydown-R', () => this.restartRun());
  }

  private makeButton(x: number, y: number, label: string, enabled: boolean, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 220, 56, enabled ? 0x68b54c : 0x555555, enabled ? 1 : 0.6)
      .setStrokeStyle(2, 0xffffff, enabled ? 1 : 0.4);
    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: enabled ? '#ffffff' : '#999999',
      })
      .setOrigin(0.5);
    if (!enabled) {
      this.add
        .text(x, y + 36, 'скоро — фаза 4', { fontFamily: 'monospace', fontSize: '13px', color: '#888888' })
        .setOrigin(0.5);
      return;
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x7fce5f));
    bg.on('pointerout', () => bg.setFillStyle(0x68b54c));
    bg.on('pointerdown', onClick);
  }

  private restartRun(): void {
    const game = this.scene.get('Game');
    this.scene.stop();
    game.scene.restart();
  }
}
