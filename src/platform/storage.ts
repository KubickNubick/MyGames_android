/**
 * Выбор реализации SaveStorage по платформе:
 * нативный Capacitor (Android) — Preferences, браузер — localStorage.
 */
import type { SaveStorage } from '../core/save/storage';
import { LocalStorageSave } from '../core/save/storage';
import { PreferencesSave } from '../core/save/preferencesSave';

export async function createPlatformStorage(): Promise<SaveStorage> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    return PreferencesSave.create(Preferences);
  }
  return new LocalStorageSave();
}
