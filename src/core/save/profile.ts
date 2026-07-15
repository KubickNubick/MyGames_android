/**
 * Профиль игрока: кошелёк, апгрейды, рекорды. Обёртка над SaveStorage,
 * каждое изменение сразу персистится. Чистый модуль (инвариант №3).
 */
import type { SaveStorage } from './storage';
import { migrateSave, type SaveData, type VehicleSave, type AudioSettings } from './schema';
import { upgradePrice, UPGRADES, type UpgradeBranch, type UpgradeLevels } from '../../data/upgrades';

export class PlayerProfile {
  private readonly data: SaveData;

  constructor(private readonly storage: SaveStorage) {
    this.data = migrateSave(storage.load());
    this.persist(); // нормализованный вид сразу в хранилище
  }

  get coins(): number {
    return this.data.coins;
  }

  get selectedVehicle(): string {
    return this.data.selectedVehicle;
  }

  get selectedStage(): string {
    return this.data.selectedStage;
  }

  getVehicle(id: string): VehicleSave | undefined {
    return this.data.vehicles[id];
  }

  getUpgrades(vehicleId: string = this.data.selectedVehicle): UpgradeLevels {
    const vehicle = this.data.vehicles[vehicleId];
    return vehicle ? { ...vehicle.upgrades } : { engine: 0, suspension: 0, tires: 0, fourWheelDrive: 0 };
  }

  getBestDistance(stageId: string): number {
    return this.data.bestDistance[stageId] ?? 0;
  }

  addCoins(amount: number): void {
    if (amount <= 0) return;
    this.data.coins += Math.floor(amount);
    this.persist();
  }

  /** Цена следующего уровня ветки или null, если уровень максимальный. */
  nextUpgradePrice(vehicleId: string, branch: UpgradeBranch): number | null {
    const vehicle = this.data.vehicles[vehicleId];
    if (!vehicle) return null;
    const level = vehicle.upgrades[branch];
    if (level >= UPGRADES[branch].maxLevel) return null;
    return upgradePrice(branch, level);
  }

  /** Покупка уровня: проверяет деньги и максимум. true = куплено. */
  buyUpgrade(vehicleId: string, branch: UpgradeBranch): boolean {
    const vehicle = this.data.vehicles[vehicleId];
    if (!vehicle || !vehicle.owned) return false;
    const price = this.nextUpgradePrice(vehicleId, branch);
    if (price === null || this.data.coins < price) return false;
    this.data.coins -= price;
    vehicle.upgrades[branch] += 1;
    this.persist();
    return true;
  }

  get settings(): AudioSettings {
    return { ...this.data.settings };
  }

  setVolume(volume: number): void {
    this.data.settings.volume = Math.min(1, Math.max(0, volume));
    this.persist();
  }

  setMuted(muted: boolean): void {
    this.data.settings.muted = muted;
    this.persist();
  }

  /** Выбор этапа (валидность id проверяет вызывающий по data/stages). */
  setSelectedStage(stageId: string): void {
    if (typeof stageId !== 'string' || stageId.length === 0) return;
    this.data.selectedStage = stageId;
    this.persist();
  }

  /** Обновить рекорд дистанции. true = новый рекорд. */
  updateBestDistance(stageId: string, distance: number): boolean {
    const best = this.data.bestDistance[stageId] ?? 0;
    if (distance <= best) return false;
    this.data.bestDistance[stageId] = Math.floor(distance);
    this.persist();
    return true;
  }

  private persist(): void {
    this.storage.save(JSON.stringify(this.data));
  }
}
