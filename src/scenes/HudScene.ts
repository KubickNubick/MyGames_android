import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { FUEL } from '../data/gameplay';
import type { RunState } from '../core/gameplay/run';

/** Данные для HUD; GameScene кладёт их в registry каждый кадр. */
export interface HudData {
  fuelFraction: number;
  coins: number;
  distance: number;
  state: RunState;
  fps: number;
}

const BAR_W = 240;
const BAR_H = 20;

/** HUD отдельной сценой поверх Game: бар топлива, монеты, дистанция. */
export class HudScene extends Phaser.Scene {
  private fuelFill!: Phaser.GameObjects.Rectangle;
  private fuelLabel!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super('Hud');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .rectangle(cx, 24, BAR_W + 4, BAR_H + 4, 0x272a31, 0.85)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.9);
    this.fuelFill = this.add.rectangle(cx - BAR_W / 2, 24, BAR_W, BAR_H - 2, 0x68b54c).setOrigin(0, 0.5);
    this.fuelLabel = this.add
      .text(cx, 24, 'ТОПЛИВО', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);

    this.coinsText = this.add.text(GAME_WIDTH - 16, 12, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffcd44',
    });
    this.coinsText.setOrigin(1, 0);

    this.distanceText = this.add.text(16, 12, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    });

    this.fpsText = this.add.text(16, 44, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00ff88',
    });

    this.hintText = this.add
      .text(cx, 120, 'Газ — D/→/правая половина экрана', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#272a31',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  update(time: number): void {
    const data = this.registry.get('hudData') as HudData | undefined;
    if (!data) return;

    const fraction = Phaser.Math.Clamp(data.fuelFraction, 0, 1);
    this.fuelFill.width = BAR_W * fraction;
    this.fuelFill.fillColor = fraction > 0.5 ? 0x68b54c : fraction > FUEL.lowFraction ? 0xffcd44 : 0xeb4334;
    // мигание при низком топливе
    const blink = fraction >= FUEL.lowFraction || Math.sin(time / 90) > 0;
    this.fuelFill.setVisible(blink && fraction > 0);
    this.fuelLabel.setText(fraction > 0 ? 'ТОПЛИВО' : 'БАК ПУСТ');

    this.coinsText.setText(`● ${data.coins}`);
    this.distanceText.setText(`${Math.floor(data.distance)} м`);
    this.fpsText.setText(`FPS: ${Math.round(data.fps)}`);
    this.hintText.setVisible(data.state === 'ready');
  }
}
