/** Награды за трюки. ВСЕ числа наград — только здесь (инвариант №5). */

export interface RewardsConfig {
  /** Монет за первый backflip в прыжке. */
  backflip: number;
  /** Монет за первый frontflip в прыжке. */
  frontflip: number;
  /** Комбо: +доля базы за каждый следующий флип в одном прыжке (0.5 = +50%). */
  comboStep: number;
  /** Airtime: монет в секунду сверх порога. */
  airtimeCoinsPerSecond: number;
  /** Порог airtime, с. */
  airtimeMinSeconds: number;
}

export const REWARDS: RewardsConfig = {
  backflip: 50,
  frontflip: 50,
  comboStep: 0.5,
  airtimeCoinsPerSecond: 2,
  airtimeMinSeconds: 1.5,
};
