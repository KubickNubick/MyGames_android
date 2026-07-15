import Phaser from 'phaser';
import { parseDebugParams, type DebugParams } from '../config';
import { PlayerProfile } from '../core/save/profile';
import { LocalStorageSave } from '../core/save/storage';

/** Boot: URL-параметры отладки + профиль игрока (сейв) — в registry. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const debug: DebugParams = parseDebugParams(window.location.search);
    this.registry.set('debug', debug);
    this.registry.set('profile', new PlayerProfile(new LocalStorageSave()));
    this.scene.start('Preload');
  }
}
