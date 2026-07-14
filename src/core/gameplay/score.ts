/** Начисление наград за трюки по data/rewards.ts. Чистые функции. */
import type { FlipResult } from './flips';
import { REWARDS, type RewardsConfig } from '../../data/rewards';

export interface RewardEntry {
  label: string;
  coins: number;
}

export interface RewardBreakdown {
  coins: number;
  entries: RewardEntry[];
}

/** Награда за прыжок: флипы с комбо (+50% базы за каждый следующий) + airtime. */
export function computeJumpReward(result: FlipResult, cfg: RewardsConfig = REWARDS): RewardBreakdown {
  const entries: RewardEntry[] = [];

  const base = result.kind === 'backflip' ? cfg.backflip : cfg.frontflip;
  const label = result.kind === 'backflip' ? 'BACKFLIP' : 'FRONTFLIP';
  for (let i = 0; i < result.flips; i++) {
    const coins = Math.round(base * (1 + cfg.comboStep * i));
    entries.push({ label: i === 0 ? label : `${label} x${i + 1}`, coins });
  }

  const airOver = result.airTimeSeconds - cfg.airtimeMinSeconds;
  if (airOver > 0) {
    const coins = Math.floor(airOver * cfg.airtimeCoinsPerSecond);
    if (coins > 0) entries.push({ label: 'AIRTIME', coins });
  }

  return { coins: entries.reduce((s, e) => s + e.coins, 0), entries };
}
