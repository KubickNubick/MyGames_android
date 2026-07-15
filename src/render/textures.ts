/** Ключи текстур и проверка наличия (нет файла ⇒ placeholder из Graphics). */
import type Phaser from 'phaser';

export const TEX = {
  jeepBody: 'jeep_body',
  jeepWheel: 'jeep_wheel',
  driverHead: 'driver_head',
  ground: (set: string) => `terrain_ground_${set}`,
  surface: (set: string) => `terrain_surface_${set}`,
  sky: (set: string) => `bg_sky_${set}`,
  hillsFar: (set: string) => `bg_hills_far_${set}`,
  hillsNear: (set: string) => `bg_hills_near_${set}`,
  cloud: (set: string, n: number) => `bg_cloud_${n}_${set}`,
  coin: 'pickup_coin',
  fuel: 'pickup_fuel',
  iconCoin: 'icon_coin',
  iconFuel: 'icon_fuel',
  iconDistance: 'icon_distance',
} as const;

export function hasTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}
