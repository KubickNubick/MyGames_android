import { describe, it, expect } from 'vitest';
import { MemorySave } from '../src/core/save/storage';
import { migrateSave, defaultSave, SAVE_VERSION } from '../src/core/save/schema';
import { PlayerProfile } from '../src/core/save/profile';
import { upgradePrice } from '../src/data/upgrades';

describe('миграция сейва', () => {
  it('null / битый JSON / не-объект ⇒ дефолт', () => {
    expect(migrateSave(null)).toEqual(defaultSave());
    expect(migrateSave('{oops')).toEqual(defaultSave());
    expect(migrateSave('"строка"')).toEqual(defaultSave());
    expect(migrateSave('42')).toEqual(defaultSave());
  });

  it('неизвестная версия ⇒ дефолт (не падаем на будущих сейвах)', () => {
    expect(migrateSave(JSON.stringify({ version: 999, coins: 5000 }))).toEqual(defaultSave());
    expect(migrateSave(JSON.stringify({ coins: 5000 }))).toEqual(defaultSave());
  });

  it('миграция v1 → v2: прогресс сохраняется, настройки получают дефолт', () => {
    const v1 = {
      version: 1,
      coins: 4095,
      vehicles: {
        jeep: { owned: true, upgrades: { engine: 2, suspension: 0, tires: 1, fourWheelDrive: 0 } },
      },
      selectedVehicle: 'jeep',
      selectedStage: 'moon',
      bestDistance: { countryside: 137 },
    };
    const save = migrateSave(JSON.stringify(v1));
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.coins).toBe(4095);
    expect(save.vehicles.jeep.upgrades.engine).toBe(2);
    expect(save.selectedStage).toBe('moon');
    expect(save.bestDistance.countryside).toBe(137);
    expect(save.settings).toEqual({ volume: 0.8, muted: false });
  });

  it('настройки v2 нормализуются: громкость зажимается в [0, 1]', () => {
    const save = migrateSave(JSON.stringify({ version: SAVE_VERSION, settings: { volume: 5, muted: 'да' } }));
    expect(save.settings).toEqual({ volume: 1, muted: false });
  });

  it('текущая версия: частичные данные нормализуются', () => {
    const raw = JSON.stringify({ version: SAVE_VERSION, coins: 123.9 });
    const save = migrateSave(raw);
    expect(save.coins).toBe(123);
    expect(save.vehicles.jeep.owned).toBe(true);
    expect(save.vehicles.jeep.upgrades).toEqual({
      engine: 0,
      suspension: 0,
      tires: 0,
      fourWheelDrive: 0,
    });
    expect(save.selectedVehicle).toBe('jeep');
  });

  it('мусор в полях вычищается: отрицательные монеты, уровни за пределами, чужой selectedVehicle', () => {
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      coins: -50,
      vehicles: {
        jeep: { owned: true, upgrades: { engine: 99, tires: -3, suspension: 'x' } },
        tank: { owned: false, upgrades: {} },
      },
      selectedVehicle: 'tank', // не куплен — откат на jeep
      bestDistance: { countryside: -10, desert: 250 },
    });
    const save = migrateSave(raw);
    expect(save.coins).toBe(0);
    expect(save.vehicles.jeep.upgrades.engine).toBe(10); // зажат до максимума
    expect(save.vehicles.jeep.upgrades.tires).toBe(0);
    expect(save.vehicles.jeep.upgrades.suspension).toBe(0);
    expect(save.selectedVehicle).toBe('jeep');
    expect(save.bestDistance).toEqual({ desert: 250 });
  });

  it('round-trip: валидный сейв проходит без изменений', () => {
    const save = defaultSave();
    save.coins = 777;
    save.vehicles.jeep.upgrades.engine = 4;
    save.bestDistance.countryside = 512;
    expect(migrateSave(JSON.stringify(save))).toEqual(save);
  });
});

describe('PlayerProfile', () => {
  it('прогресс переживает пересоздание (перезагрузку страницы)', () => {
    const storage = new MemorySave();
    const p1 = new PlayerProfile(storage);
    p1.addCoins(1000);
    expect(p1.buyUpgrade('jeep', 'engine')).toBe(true);
    p1.updateBestDistance('countryside', 321);

    // «перезагрузка»: новый профиль из того же хранилища
    const p2 = new PlayerProfile(storage);
    expect(p2.coins).toBe(1000 - upgradePrice('engine', 0));
    expect(p2.getUpgrades('jeep').engine).toBe(1);
    expect(p2.getBestDistance('countryside')).toBe(321);
  });

  it('покупка: не хватает денег ⇒ отказ без списания', () => {
    const p = new PlayerProfile(new MemorySave());
    p.addCoins(100); // < 300
    expect(p.buyUpgrade('jeep', 'engine')).toBe(false);
    expect(p.coins).toBe(100);
    expect(p.getUpgrades('jeep').engine).toBe(0);
  });

  it('цены растут с уровнем, на максимуме покупка невозможна', () => {
    const p = new PlayerProfile(new MemorySave());
    p.addCoins(10_000_000);
    let total = 0;
    for (let lvl = 0; lvl < 10; lvl++) {
      const price = p.nextUpgradePrice('jeep', 'tires')!;
      expect(price).toBe(upgradePrice('tires', lvl));
      expect(p.buyUpgrade('jeep', 'tires')).toBe(true);
      total += price;
    }
    expect(p.getUpgrades('jeep').tires).toBe(10);
    expect(p.nextUpgradePrice('jeep', 'tires')).toBeNull();
    expect(p.buyUpgrade('jeep', 'tires')).toBe(false);
    expect(p.coins).toBe(10_000_000 - total);
  });

  it('рекорд обновляется только при улучшении', () => {
    const p = new PlayerProfile(new MemorySave());
    expect(p.updateBestDistance('countryside', 100)).toBe(true);
    expect(p.updateBestDistance('countryside', 80)).toBe(false);
    expect(p.updateBestDistance('countryside', 150)).toBe(true);
    expect(p.getBestDistance('countryside')).toBe(150);
  });

  it('несуществующая машина: покупка невозможна', () => {
    const p = new PlayerProfile(new MemorySave());
    p.addCoins(100000);
    expect(p.buyUpgrade('ufo', 'engine')).toBe(false);
  });
});
