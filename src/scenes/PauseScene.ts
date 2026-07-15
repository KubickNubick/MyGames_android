import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { PlayerProfile } from '../core/save/profile';

/** Пауза поверх Game: продолжить/заново/гараж + громкость и mute (в сейв). */
export class PauseScene extends Phaser.Scene {
  private profile!: PlayerProfile;
  private volumeText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.profile = this.registry.get('profile') as PlayerProfile;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x272a31, 0.6);
    this.add.rectangle(cx, cy, 520, 430, 0x272a31, 0.95).setStrokeStyle(3, 0xffcd44);
    this.add
      .text(cx, cy - 165, 'ПАУЗА', { fontFamily: 'monospace', fontSize: '44px', color: '#ffffff' })
      .setOrigin(0.5);

    this.makeButton(cx, cy - 90, 'ПРОДОЛЖИТЬ (P)', () => this.resumeGame());
    this.makeButton(cx, cy - 20, 'ЗАНОВО (R)', () => this.restartRun());
    this.makeButton(cx, cy + 50, 'ГАРАЖ (G)', () => this.goGarage());

    // Громкость: −/+ и mute.
    this.volumeText = this.add
      .text(cx, cy + 130, '', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);
    const makeVolButton = (x: number, label: string, delta: number): void => {
      const t = this.add
        .text(x, cy + 130, label, { fontFamily: 'monospace', fontSize: '34px', color: '#ffcd44' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.changeVolume(delta));
    };
    makeVolButton(cx - 150, '−', -0.1);
    makeVolButton(cx + 150, '+', 0.1);

    this.muteText = this.add
      .text(cx, cy + 180, '', { fontFamily: 'monospace', fontSize: '20px', color: '#aaaaaa' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.muteText.on('pointerdown', () => this.toggleMute());

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-P', () => this.resumeGame());
    keyboard?.on('keydown-ESC', () => this.resumeGame());
    keyboard?.on('keydown-R', () => this.restartRun());
    keyboard?.on('keydown-G', () => this.goGarage());
    keyboard?.on('keydown-M', () => this.toggleMute());

    this.refresh();
  }

  private changeVolume(delta: number): void {
    this.profile.setVolume(Math.round((this.profile.settings.volume + delta) * 10) / 10);
    this.applyAudio();
    this.refresh();
  }

  private toggleMute(): void {
    this.profile.setMuted(!this.profile.settings.muted);
    this.applyAudio();
    this.refresh();
  }

  private applyAudio(): void {
    this.sound.volume = this.profile.settings.volume;
    this.sound.mute = this.profile.settings.muted;
  }

  private refresh(): void {
    const s = this.profile.settings;
    this.volumeText.setText(`ГРОМКОСТЬ  ${Math.round(s.volume * 100)}%`);
    this.muteText.setText(s.muted ? '🔇 ЗВУК ВЫКЛ (M)' : '🔊 ЗВУК ВКЛ (M)');
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 320, 54, 0x68b54c)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x7fce5f));
    bg.on('pointerout', () => bg.setFillStyle(0x68b54c));
    bg.on('pointerdown', onClick);
  }

  private resumeGame(): void {
    const game = this.scene.get('Game') as Phaser.Scene & { onResumed?: () => void };
    this.scene.stop();
    this.scene.resume('Game');
    game.onResumed?.();
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
