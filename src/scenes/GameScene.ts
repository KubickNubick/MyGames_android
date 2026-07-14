import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { DebugParams } from '../config';

/** Game: пока пустой канвас со счётчиком FPS (фаза 0). Физика — в фазе 1. */
export class GameScene extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'HILL RACER\nфаза 0 — каркас', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 90,
        `seed=${debug.seed ?? '—'} auto=${debug.autoGas ? 'gas' : '—'}`,
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffcd44',
        },
      )
      .setOrigin(0.5);

    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00ff88',
    });
  }

  update(): void {
    this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
  }
}
