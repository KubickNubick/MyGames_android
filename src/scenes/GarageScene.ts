import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { PlayerProfile } from '../core/save/profile';
import { VEHICLES, JEEP } from '../data/vehicles';
import { applyUpgrades, UPGRADES, UPGRADE_BRANCHES, type UpgradeBranch } from '../data/upgrades';
import { STAGES, STAGE_IDS, DEFAULT_STAGE_ID } from '../data/stages';
import { drawVehiclePreview } from '../render/vehiclePreview';

interface UpgradeRow {
  branch: UpgradeBranch;
  pips: Phaser.GameObjects.Graphics;
  priceBg: Phaser.GameObjects.Rectangle;
  priceText: Phaser.GameObjects.Text;
}

const ROW_X = 660;
const ROW_W = 560;
const PIP_W = 34;
const PIP_H = 12;

/** Гараж: апгрейды за монеты, превью характеристик, выбор машины (каркас). */
export class GarageScene extends Phaser.Scene {
  private profile!: PlayerProfile;
  private rows: UpgradeRow[] = [];
  private coinsText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private recordText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;

  constructor() {
    super('Garage');
  }

  create(): void {
    this.profile = this.registry.get('profile') as PlayerProfile;
    this.rows = [];

    this.cameras.main.setBackgroundColor('#2e3440');
    this.add
      .text(40, 28, 'ГАРАЖ', { fontFamily: 'monospace', fontSize: '44px', color: '#ffffff' })
      .setOrigin(0, 0);
    this.coinsText = this.add
      .text(GAME_WIDTH - 40, 40, '', { fontFamily: 'monospace', fontSize: '30px', color: '#ffcd44' })
      .setOrigin(1, 0);

    // Превью машины (пока одна — Jeep; каркас под несколько).
    const params = this.currentParams();
    drawVehiclePreview(this, params, 310, 320);
    this.add
      .text(310, 130, params.id.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.recordText = this.add
      .text(310, 470, '', { fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa' })
      .setOrigin(0.5, 0);
    this.statsText = this.add
      .text(120, 505, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e5e9f0',
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    // Ветки апгрейдов.
    UPGRADE_BRANCHES.forEach((branch, i) => this.makeRow(branch, 150 + i * 95));

    // Выбор этапа: ◀ Название ▶ (сохраняется в профиль).
    const stageY = GAME_HEIGHT - 70;
    this.stageText = this.add
      .text(310, stageY, '', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);
    const makeArrow = (x: number, label: string, dir: 1 | -1): void => {
      const arrow = this.add
        .text(x, stageY, label, { fontFamily: 'monospace', fontSize: '32px', color: '#ffcd44' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      arrow.on('pointerdown', () => this.cycleStage(dir));
    };
    makeArrow(140, '◀', -1);
    makeArrow(480, '▶', 1);

    // В заезд.
    const startBg = this.add
      .rectangle(GAME_WIDTH - 190, GAME_HEIGHT - 70, 300, 70, 0x68b54c)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH - 190, GAME_HEIGHT - 70, 'В ЗАЕЗД ▶', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    startBg.on('pointerover', () => startBg.setFillStyle(0x7fce5f));
    startBg.on('pointerout', () => startBg.setFillStyle(0x68b54c));
    startBg.on('pointerdown', () => this.scene.start('Game'));
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('Game'));
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('Game'));

    this.refresh();
  }

  private cycleStage(dir: 1 | -1): void {
    const current = this.profile.selectedStage in STAGES ? this.profile.selectedStage : DEFAULT_STAGE_ID;
    const i = STAGE_IDS.indexOf(current);
    const next = STAGE_IDS[(i + dir + STAGE_IDS.length) % STAGE_IDS.length];
    this.profile.setSelectedStage(next);
    this.refresh();
  }

  private currentParams() {
    const base = VEHICLES[this.profile.selectedVehicle] ?? JEEP;
    return applyUpgrades(base, this.profile.getUpgrades());
  }

  private makeRow(branch: UpgradeBranch, y: number): void {
    this.add.text(ROW_X, y, UPGRADES[branch].title, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    });
    const pips = this.add.graphics();
    const priceBg = this.add
      .rectangle(ROW_X + ROW_W - 80, y + 26, 160, 52, 0x68b54c)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const priceText = this.add
      .text(ROW_X + ROW_W - 80, y + 26, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);
    priceBg.on('pointerdown', () => {
      if (this.profile.buyUpgrade(this.profile.selectedVehicle, branch)) this.refresh();
    });
    this.rows.push({ branch, pips, priceBg, priceText });
    // позиция пипсов
    pips.setPosition(ROW_X, y + 40);
  }

  private refresh(): void {
    const vehicleId = this.profile.selectedVehicle;
    const levels = this.profile.getUpgrades(vehicleId);
    this.coinsText.setText(`● ${this.profile.coins}`);

    for (const row of this.rows) {
      const level = levels[row.branch];
      const price = this.profile.nextUpgradePrice(vehicleId, row.branch);

      row.pips.clear();
      for (let i = 0; i < UPGRADES[row.branch].maxLevel; i++) {
        if (i < level) {
          row.pips.fillStyle(0xffcd44);
          row.pips.fillRect(i * (PIP_W + 4), 0, PIP_W, PIP_H);
        } else {
          row.pips.lineStyle(2, 0x666666);
          row.pips.strokeRect(i * (PIP_W + 4), 0, PIP_W, PIP_H);
        }
      }

      if (price === null) {
        row.priceText.setText('MAX');
        row.priceBg.setFillStyle(0x555555, 0.6).disableInteractive();
      } else {
        const affordable = this.profile.coins >= price;
        row.priceText.setText(`${price} ●`);
        if (affordable) {
          row.priceBg.setFillStyle(0x68b54c, 1).setInteractive({ useHandCursor: true });
        } else {
          row.priceBg.setFillStyle(0x8a4a42, 0.8).disableInteractive();
        }
      }
    }

    const p = this.currentParams();
    const kmh = p.engine.maxWheelSpeed * p.wheel.radius * 3.6;
    this.statsText.setText(
      [
        `Торк      ${p.engine.torque.toFixed(0)} Н·м`,
        `Скорость  ~${kmh.toFixed(0)} км/ч`,
        `Подвеска  ${p.suspension.frequencyHz.toFixed(1)} Гц / ${p.suspension.dampingRatio.toFixed(2)}`,
        `Трение    ${p.wheel.friction.toFixed(2)}`,
        `4WD       ${p.fourWheelDrive ? `вкл (${Math.round(p.frontTorqueShare * 100)}% на перед)` : 'выкл'}`,
      ].join('\n'),
    );

    const stageId = this.profile.selectedStage in STAGES ? this.profile.selectedStage : DEFAULT_STAGE_ID;
    const best = this.profile.getBestDistance(stageId);
    this.recordText.setText(best > 0 ? `Рекорд (${STAGES[stageId].title}): ${best} м` : 'Рекорда пока нет');
    this.stageText.setText(`ЭТАП: ${STAGES[stageId].title}`);
  }
}
