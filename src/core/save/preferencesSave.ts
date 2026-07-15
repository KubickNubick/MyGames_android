/**
 * SaveStorage поверх Capacitor Preferences (Android/iOS).
 * Интерфейс SaveStorage синхронный, а Preferences — асинхронный, поэтому:
 * значение читается один раз при создании (await), записи — write-behind.
 * Ядро не импортирует @capacitor: плагин инжектится (тестируемо в Node).
 */
import type { SaveStorage } from './storage';
import { SAVE_KEY } from './storage';

/** Минимальный интерфейс плагина Preferences. */
export interface PreferencesLike {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

export class PreferencesSave implements SaveStorage {
  private constructor(
    private readonly prefs: PreferencesLike,
    private readonly key: string,
    private cached: string | null,
  ) {}

  static async create(prefs: PreferencesLike, key: string = SAVE_KEY): Promise<PreferencesSave> {
    let value: string | null = null;
    try {
      value = (await prefs.get({ key })).value;
    } catch {
      value = null; // хранилище недоступно — играем без сейва
    }
    return new PreferencesSave(prefs, key, value);
  }

  load(): string | null {
    return this.cached;
  }

  save(data: string): void {
    this.cached = data;
    void this.prefs.set({ key: this.key, value: data }).catch(() => {
      /* запись не удалась — кэш всё равно актуален до перезапуска */
    });
  }

  clear(): void {
    this.cached = null;
    void this.prefs.remove({ key: this.key }).catch(() => {});
  }
}
