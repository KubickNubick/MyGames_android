import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { FUEL } from '../data/gameplay';
import type { RunState } from '../core/gameplay/run';
import { TEX, hasTexture } from '../render/textures';

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
  private btnGas: Phaser.GameObjects.Image | null = null;
  private btnBrake: Phaser.GameObjects.Image | null = null;

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
    if (hasTexture(this, TEX.iconFuel)) {
      this.add.image(cx - BAR_W / 2 - 24, 24, TEX.iconFuel).setDisplaySize(30, 30);
    }

    this.coinsText = this.add.text(GAME_WIDTH - 16, 12, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffcd44',
    });
    this.coinsText.setOrigin(1, 0);
    if (hasTexture(this, TEX.iconCoin)) {
      this.add.image(GAME_WIDTH - 116, 26, TEX.iconCoin).setDisplaySize(28, 28);
    }

    this.distanceText = this.add.text(48, 12, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    });
    if (hasTexture(this, TEX.iconDistance)) {
      this.add.image(26, 26, TEX.iconDistance).setDisplaySize(28, 28);
    }

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

    // Кнопка паузы (и для тача).
    const pauseBtn = this.add
      .text(cx + BAR_W / 2 + 46, 24, '⏸', { fontFamily: 'monospace', fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => {
      const game = this.scene.get('Game') as Phaser.Scene & { pauseGame?: () => void };
      game.pauseGame?.();
    });

    // Видимые тач-зоны газ/тормоз (сам ввод — по половинам экрана в GameScene).
    if (this.sys.game.device.input.touch) {
      const size = Math.round(GAME_HEIGHT * 0.26); // ~под палец
      const margin = Math.round(size * 0.42);
      if (hasTexture(this, 'btn_brake')) {
        this.btnBrake = this.add
          .image(margin + size / 2, GAME_HEIGHT - margin - size / 2, 'btn_brake')
          .setDisplaySize(size, size)
          .setAlpha(0.55);
      }
      if (hasTexture(this, 'btn_gas')) {
        this.btnGas = this.add
          .image(GAME_WIDTH - margin - size / 2, GAME_HEIGHT - margin - size / 2, 'btn_gas')
          .setDisplaySize(size, size)
          .setAlpha(0.55);
      }
    }
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

    this.coinsText.setText(`${data.coins}`);
    this.distanceText.setText(`${Math.floor(data.distance)} м`);
    this.fpsText.setText(`FPS: ${Math.round(data.fps)}`);
    this.hintText.setVisible(data.state === 'ready');

    // Подсветка активной тач-зоны.
    if (this.btnGas || this.btnBrake) {
      let gasDown = false;
      let brakeDown = false;
      for (const pointer of [this.input.pointer1, this.input.activePointer]) {
        if (pointer?.isDown) {
          if (pointer.x >= GAME_WIDTH / 2) gasDown = true;
          else brakeDown = true;
        }
      }
      this.btnGas?.setAlpha(gasDown ? 0.95 : 0.55);
      this.btnBrake?.setAlpha(brakeDown ? 0.95 : 0.55);
    }
  }
}
