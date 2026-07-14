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
import { JEEP } from '../data/vehicles';
import { STAGES, DEFAULT_STAGE_ID } from '../data/stages';
import { FUEL, COIN_GROUPS } from '../data/gameplay';
import { CarView } from '../render/carView';
import { drawGround } from '../render/terrainView';
import { drawPickup } from '../render/pickupView';
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
  private chunkGraphics = new Map<number, Phaser.GameObjects.Graphics>();

  private run!: Run;
  private tank!: FuelTank;
  private flips!: FlipTracker;
  private pickups!: PickupField;
  private pickupGraphics = new Map<number, Phaser.GameObjects.Graphics>();
  private popupSlot = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private autoGas = false;
  private camZoom = ZOOM_BASE;

  constructor() {
    super('Game');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;
    this.autoGas = debug.autoGas;
    this.camZoom = ZOOM_BASE;
    this.chunkBodies = new Map();
    this.chunkGraphics = new Map();
    this.pickupGraphics = new Map();
    this.popupSlot = 0;

    const stage = STAGES[debug.stage ?? DEFAULT_STAGE_ID] ?? STAGES[DEFAULT_STAGE_ID];
    const seed = debug.seed ?? Math.floor(Math.random() * 2 ** 31);

    // --- Физика и рельеф ---
    this.world = createWorld(stage.gravityY);
    this.stepper = new FixedStepper();
    const heightFn = createHeightFn(seed, stage.terrain);
    this.chunks = new ChunkManager(heightFn, {
      onCreate: (chunk) => {
        this.chunkBodies.set(chunk.index, createTerrainBody(this.world, chunk.points));
        this.chunkGraphics.set(chunk.index, drawGround(this, chunk.points));
      },
      onDestroy: (chunk) => {
        const body = this.chunkBodies.get(chunk.index);
        if (body) {
          this.world.destroyBody(body);
          this.chunkBodies.delete(chunk.index);
        }
        this.chunkGraphics.get(chunk.index)?.destroy();
        this.chunkGraphics.delete(chunk.index);
      },
    });

    const spawnX = debug.spawnX;
    this.chunks.update(spawnX);
    this.car = createCar(this.world, JEEP, { x: spawnX, y: heightFn(spawnX) - 1.0 });

    // --- Игровой цикл ---
    this.run = new Run(spawnX);
    this.tank = new FuelTank(FUEL.tankCapacity, FUEL.consumptionPerSecond);
    this.flips = new FlipTracker();
    this.car.onDeath(() => this.run.notifyDeath());
    this.run.onChange((state) => {
      if (state === 'results') this.showResults();
    });

    this.pickups = new PickupField(this.world, new PickupPlanner(seed, heightFn));
    this.pickups.onSpawn((p) => this.pickupGraphics.set(p.id, drawPickup(this, p)));
    this.pickups.onRemove((p) => {
      this.pickupGraphics.get(p.id)?.destroy();
      this.pickupGraphics.delete(p.id);
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
    this.carView = new CarView(this, this.car);
    if (debug.debugDraw) this.debugView = new DebugView(this);
    this.cameras.main.setBackgroundColor('#49a6e0');

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
    const data: ResultsData = {
      distance: this.run.distance,
      coins: this.run.coins,
      reason: this.run.endReason ?? 'crash',
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

  update(_time: number, delta: number): void {
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

    this.carView.update();
    this.debugView?.update(this.world);
    this.updateCamera();

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
