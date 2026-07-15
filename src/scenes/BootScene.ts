import Phaser from 'phaser';
import { parseDebugParams, type DebugParams } from '../config';
import { PlayerProfile } from '../core/save/profile';
import { createPlatformStorage } from '../platform/storage';

/** Boot: URL-параметры отладки + профиль игрока (сейв) — в registry. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const debug: DebugParams = parseDebugParams(window.location.search);
    this.registry.set('debug', debug);
    void this.initProfile();
  }

  /** Сторадж платформенный и асинхронный (Capacitor Preferences) — ждём его до Preload. */
  private async initProfile(): Promise<void> {
    const storage = await createPlatformStorage();
    this.registry.set('profile', new PlayerProfile(storage));
    this.scene.start('Preload');
  }
}
