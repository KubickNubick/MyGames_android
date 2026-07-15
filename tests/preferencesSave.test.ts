import { describe, it, expect } from 'vitest';
import { PreferencesSave, type PreferencesLike } from '../src/core/save/preferencesSave';
import { PlayerProfile } from '../src/core/save/profile';

/** Фейковый плагин Preferences: асинхронное хранилище в памяти. */
function fakePrefs(initial: Record<string, string> = {}): PreferencesLike & { store: Map<string, string> } {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get({ key }) {
      return { value: store.get(key) ?? null };
    },
    async set({ key, value }) {
      store.set(key, value);
    },
    async remove({ key }) {
      store.delete(key);
    },
  };
}

const flushAsync = () => new Promise((r) => setTimeout(r, 0));

describe('PreferencesSave (Capacitor)', () => {
  it('читает существующее значение при создании', async () => {
    const prefs = fakePrefs({ 'hill-racer-save': '{"версия":"тест"}' });
    const storage = await PreferencesSave.create(prefs);
    expect(storage.load()).toBe('{"версия":"тест"}');
  });

  it('save: кэш синхронно, запись в плагин write-behind', async () => {
    const prefs = fakePrefs();
    const storage = await PreferencesSave.create(prefs);
    storage.save('данные');
    expect(storage.load()).toBe('данные'); // сразу из кэша
    await flushAsync();
    expect(prefs.store.get('hill-racer-save')).toBe('данные'); // долетело в плагин
  });

  it('clear очищает кэш и хранилище', async () => {
    const prefs = fakePrefs({ 'hill-racer-save': 'x' });
    const storage = await PreferencesSave.create(prefs);
    storage.clear();
    expect(storage.load()).toBeNull();
    await flushAsync();
    expect(prefs.store.has('hill-racer-save')).toBe(false);
  });

  it('ошибки плагина не роняют игру', async () => {
    const broken: PreferencesLike = {
      get: () => Promise.reject(new Error('нет доступа')),
      set: () => Promise.reject(new Error('нет доступа')),
      remove: () => Promise.reject(new Error('нет доступа')),
    };
    const storage = await PreferencesSave.create(broken);
    expect(storage.load()).toBeNull();
    expect(() => storage.save('x')).not.toThrow();
    await flushAsync();
    expect(storage.load()).toBe('x'); // кэш живёт до перезапуска
  });

  it('PlayerProfile работает поверх PreferencesSave: полный цикл', async () => {
    const prefs = fakePrefs();
    const p1 = new PlayerProfile(await PreferencesSave.create(prefs));
    p1.addCoins(500);
    p1.setSelectedStage('moon');
    await flushAsync();

    // «перезапуск приложения»: новый профиль из того же плагина
    const p2 = new PlayerProfile(await PreferencesSave.create(prefs));
    expect(p2.coins).toBe(500);
    expect(p2.selectedStage).toBe('moon');
  });
});
