import Phaser from 'phaser';
import type { World, Body } from 'planck';
import { GAME_WIDTH, PX_PER_M } from '../config';
import type { DebugParams } from '../config';
import { createWorld, FixedStepper, FIXED_DT } from '../core/physics/world';
import { createTerrainBody } from '../core/physics/terrainBody';
import { createCar, type Car, type DriveInput } from '../core/physics/car';
import { createHeightFn } from '../core/terrain/generator';
import { ChunkManager } from '../core/terrain/chunks';
import { Run } from '../core/gameplay/run';
import { FuelTank } from '../core/gameplay/fuel';
import { FlipTracker } from '../core/gameplay/flips';
import { computeJumpReward } from '../core/gameplay/score';
import { PickupPlanner, PickupField } from '../core/gameplay/pickups';
import { VEHICLES, JEEP } from '../data/vehicles';
import { STAGES, DEFAULT_STAGE_ID } from '../data/stages';
import { FUEL, COIN_GROUPS } from '../data/gameplay';
import { applyUpgrades } from '../data/upgrades';
import type { PlayerProfile } from '../core/save/profile';
import { CarView } from '../render/carView';
import { TerrainChunkView } from '../render/terrainView';
import { Parallax } from '../render/parallax';
import { drawPickup, destroyPickupView } from '../render/pickupView';
import { DebugView } from '../render/debugView';
import type { HudData } from './HudScene';
import type { ResultsData } from './ResultsScene';

const CAMERA_LOOKAHEAD_S = 0.55;
const CAMERA_LERP = 0.08;
const ZOOM_BASE = 1.05;
const ZOOM_PER_MS = 0.028; // зум-аут на м/с скорости
const ZOOM_MIN = 0.6;

export class GameScene extends Phaser.Scene {
  private world!: World;
  private car!: Car;
  private stepper!: FixedStepper;
  private carView!: CarView;
  private debugView: DebugView | null = null;
  private chunks!: ChunkManager;
  private chunkBodies = new Map<number, Body>();
  private chunkViews = new Map<number, TerrainChunkView>();
  private parallax!: Parallax;

  private run!: Run;
  private tank!: FuelTank;
  private flips!: FlipTracker;
  private pickups!: PickupField;
  private pickupViews = new Map<number, Phaser.GameObjects.GameObject>();
  private popupSlot = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private autoGas = false;
  private camZoom = ZOOM_BASE;
  private stageId = DEFAULT_STAGE_ID;

  constructor() {
    super('Game');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;
    this.autoGas = debug.autoGas;
    this.camZoom = ZOOM_BASE;
    this.chunkBodies = new Map();
    this.chunkViews = new Map();
    this.pickupViews = new Map();
    this.popupSlot = 0;

    const profile = this.registry.get('profile') as PlayerProfile;
    // Этап: URL-параметр приоритетнее выбранного в гараже.
    const stage = STAGES[debug.stage ?? profile.selectedStage] ?? STAGES[DEFAULT_STAGE_ID];
    this.stageId = stage.id;
    const seed = debug.seed ?? Math.floor(Math.random() * 2 ** 31);
    // Параметры машины = база из data/vehicles + купленные апгрейды.
    const vehicleParams = applyUpgrades(VEHICLES[profile.selectedVehicle] ?? JEEP, profile.getUpgrades());

    // --- Физика и рельеф ---
    this.world = createWorld(stage.gravityY);
    this.stepper = new FixedStepper();
    const heightFn = createHeightFn(seed, stage.terrain);
    const step = 0.75;
    this.chunks = new ChunkManager(heightFn, {
      onCreate: (chunk) => {
        this.chunkBodies.set(chunk.index, createTerrainBody(this.world, chunk.points));
        // крайние точки соседних чанков — полоса поверхности без швов на стыках
        const before = { x: chunk.startX - step, y: heightFn(chunk.startX - step) };
        const after = { x: chunk.endX + step, y: heightFn(chunk.endX + step) };
        this.chunkViews.set(
          chunk.index,
          new TerrainChunkView(this, chunk.points, stage.visuals, before, after),
        );
      },
      onDestroy: (chunk) => {
        const body = this.chunkBodies.get(chunk.index);
        if (body) {
          this.world.destroyBody(body);
          this.chunkBodies.delete(chunk.index);
        }
        this.chunkViews.get(chunk.index)?.destroy();
        this.chunkViews.delete(chunk.index);
      },
    });

    const spawnX = debug.spawnX;
    this.chunks.update(spawnX);
    this.car = createCar(this.world, vehicleParams, { x: spawnX, y: heightFn(spawnX) - 1.0 });

    // --- Игровой цикл ---
    this.run = new Run(spawnX);
    this.tank = new FuelTank(FUEL.tankCapacity, FUEL.consumptionPerSecond);
    this.flips = new FlipTracker();
    this.car.onDeath(() => this.run.notifyDeath());
    this.run.onChange((state) => {
      if (state === 'results') this.showResults();
    });

    this.pickups = new PickupField(this.world, new PickupPlanner(seed, heightFn));
    this.pickups.onSpawn((p) => this.pickupViews.set(p.id, drawPickup(this, p)));
    this.pickups.onRemove((p) => {
      const view = this.pickupViews.get(p.id);
      if (view) destroyPickupView(this, view);
      this.pickupViews.delete(p.id);
    });
    this.pickups.onCollect((p) => {
      if (p.kind === 'coin') {
        this.run.addCoins(COIN_GROUPS.coinValue);
      } else if (this.run.isDriving) {
        this.tank.refill();
        this.spawnPopup('ТОПЛИВО ✔', 0x68b54c);
      }
    });
    this.pickups.update(spawnX);

    // --- Рендер ---
    this.parallax = new Parallax(this, stage.visuals);
    this.carView = new CarView(this, this.car);
    if (debug.debugDraw) this.debugView = new DebugView(this);
    this.cameras.main.setBackgroundColor(stage.visuals.backgroundColor);

    // --- Ввод: газ = D/→/правая половина экрана, тормоз = A/←/левая ---
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.input.addPointer(1);
    keyboard.on('keydown-R', () => this.scene.restart());

    // --- HUD поверх игры ---
    if (this.scene.isActive('Hud')) this.scene.get('Hud').scene.restart();
    else this.scene.launch('Hud');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('Hud');
      this.pickups.destroy();
      this.chunks.destroyAll();
      this.car.destroy();
      this.parallax.destroy();
    });
  }

  private resolveInput(): DriveInput {
    let gas = this.cursors.right.isDown || this.keyD.isDown;
    let brake = this.cursors.left.isDown || this.keyA.isDown;

    for (const pointer of [this.input.pointer1, this.input.activePointer]) {
      if (pointer && pointer.isDown) {
        if (pointer.x >= GAME_WIDTH / 2) gas = true;
        else brake = true;
      }
    }
    if (this.autoGas && !brake) gas = true;

    if (brake) return 'brake'; // тормоз приоритетнее
    if (gas) return 'gas';
    return 'none';
  }

  private showResults(): void {
    // Банкуем заработанное в профиль (сейв) и проверяем рекорд.
    const profile = this.registry.get('profile') as PlayerProfile;
    profile.addCoins(this.run.coins);
    const isRecord = profile.updateBestDistance(this.stageId, this.run.distance);

    const data: ResultsData = {
      distance: this.run.distance,
      coins: this.run.coins,
      reason: this.run.endReason ?? 'crash',
      isRecord,
      balance: profile.coins,
    };
    this.scene.pause();
    this.scene.launch('Results', data);
  }

  /** Всплывающий текст у машины (BACKFLIP +50 и т.п.), со стекингом. */
  private spawnPopup(message: string, color: number, slotDelayMs = 0): void {
    const pos = this.car.chassis.getPosition();
    const slot = this.popupSlot++;
    const text = this.add
      .text(pos.x * PX_PER_M, pos.y * PX_PER_M - 70 - (slot % 4) * 30, message, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#272a31',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1500)
      .setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 },
      duration: 120,
      delay: slotDelayMs,
    });
    this.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      delay: slotDelayMs + 500,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  update(time: number, delta: number): void {
    const rawInput = this.resolveInput();
    if (this.run.state === 'ready' && rawInput !== 'none') this.run.start();
    // Бак пуст ⇒ мотор глохнет (и газ, и реверс, и air control).
    const input: DriveInput = this.run.isDriving && !this.tank.isEmpty ? rawInput : 'none';

    this.stepper.update(delta / 1000, () => {
      this.car.setInput(input);
      this.car.step();
      this.world.step(FIXED_DT);

      const pos = this.car.chassis.getPosition();
      if (this.run.isDriving) {
        this.tank.consume(FIXED_DT);
        const jump = this.flips.update(
          FIXED_DT,
          this.car.isAirborne(),
          this.car.chassis.getAngularVelocity(),
        );
        if (jump) {
          const reward = computeJumpReward(jump);
          reward.entries.forEach((entry, i) =>
            this.spawnPopup(`${entry.label} +${entry.coins}`, 0xffcd44, i * 250),
          );
          this.run.addCoins(reward.coins);
        }
      }
      this.run.update(FIXED_DT, pos.x, Math.abs(this.car.getForwardSpeed()), this.tank.isEmpty);
      this.chunks.update(pos.x);
      this.pickups.update(pos.x);
    });

    this.carView.update(delta);
    this.debugView?.update(this.world);
    this.updateCamera();
    this.parallax.update(this.cameras.main, time);

    this.registry.set('hudData', {
      fuelFraction: this.tank.fraction,
      coins: this.run.coins,
      distance: this.run.distance,
      state: this.run.state,
      fps: this.game.loop.actualFps,
    } satisfies HudData);
  }

  private updateCamera(): void {
    const cam = this.cameras.main;
    const pos = this.car.chassis.getPosition();
    const vx = this.car.getForwardSpeed();

    const targetX = (pos.x + vx * CAMERA_LOOKAHEAD_S) * PX_PER_M;
    const targetY = pos.y * PX_PER_M - cam.height * 0.12;
    const cx = Phaser.Math.Linear(cam.midPoint.x, targetX, CAMERA_LERP);
    const cy = Phaser.Math.Linear(cam.midPoint.y, targetY, CAMERA_LERP);
    cam.centerOn(cx, cy);

    const zoomTarget = Phaser.Math.Clamp(ZOOM_BASE - Math.abs(vx) * ZOOM_PER_MS, ZOOM_MIN, ZOOM_BASE);
    this.camZoom = Phaser.Math.Linear(this.camZoom, zoomTarget, 0.04);
    cam.setZoom(this.camZoom);
  }
}
