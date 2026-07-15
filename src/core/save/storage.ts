/**
 * Интерфейс хранилища сейвов (инвариант №6).
 * Сейчас localStorage; в фазе 7 добавится реализация на Capacitor Preferences.
 */

export interface SaveStorage {
  load(): string | null;
  save(data: string): void;
  clear(): void;
}

export const SAVE_KEY = 'hill-racer-save';

export class LocalStorageSave implements SaveStorage {
  constructor(private readonly key: string = SAVE_KEY) {}

  load(): string | null {
    try {
      return window.localStorage.getItem(this.key);
    } catch {
      return null; // приватный режим/запрет доступа — играем без сейва
    }
  }

  save(data: string): void {
    try {
      window.localStorage.setItem(this.key, data);
    } catch {
      // нет места/запрещено — молча пропускаем, игра важнее
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

/** In-memory реализация для тестов и SSR. */
export class MemorySave implements SaveStorage {
  private data: string | null = null;

  load(): string | null {
    return this.data;
  }

  save(data: string): void {
    this.data = data;
  }

  clear(): void {
    this.data = null;
  }
}
