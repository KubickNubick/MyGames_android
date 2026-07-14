import Phaser from 'phaser';
import type { World, Body } from 'planck';
import { GAME_WIDTH, GAME_HEIGHT, PX_PER_M } from '../config';
import type { DebugParams } from '../config';
import { createWorld, FixedStepper, FIXED_DT } from '../core/physics/world';
import { createTerrainBody } from '../core/physics/terrainBody';
import { createCar, type Car, type DriveInput } from '../core/physics/car';
import { createHeightFn } from '../core/terrain/generator';
import { ChunkManager } from '../core/terrain/chunks';
import { JEEP } from '../data/vehicles';
import { STAGES, DEFAULT_STAGE_ID } from '../data/stages';
import { CarView } from '../render/carView';
import { drawGround } from '../render/terrainView';
import { DebugView } from '../render/debugView';

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

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private autoGas = false;

  private fpsText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private isDead = false;
  private camZoom = ZOOM_BASE;

  constructor() {
    super('Game');
  }

  create(): void {
    const debug = this.registry.get('debug') as DebugParams;
    this.autoGas = debug.autoGas;
    this.isDead = false;
    this.camZoom = ZOOM_BASE;
    this.chunkBodies = new Map();
    this.chunkGraphics = new Map();

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
    this.car.onDeath(() => this.onDeath());

    // --- Рендер ---
    this.carView = new CarView(this, this.car);
    if (debug.debugDraw) this.debugView = new DebugView(this);

    // --- Ввод: газ = D/→/правая половина экрана, тормоз = A/←/левая ---
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.input.addPointer(1);
    keyboard.on('keydown-R', () => this.scene.restart());
    this.input.on('pointerdown', () => {
      if (this.isDead) this.scene.restart();
    });

    // --- HUD (минимум до фазы 3) ---
    this.fpsText = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: '18px', color: '#00ff88' })
      .setScrollFactor(0)
      .setDepth(2000);
    this.speedText = this.add
      .text(8, 30, `seed=${seed}`, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(2000);

    this.cameras.main.setBackgroundColor('#49a6e0');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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

  private onDeath(): void {
    this.isDead = true;
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'ВОДИТЕЛЬ РАЗБИЛСЯ\n\nR или тап — заново', {
        fontFamily: 'monospace',
        fontSize: '42px',
        color: '#ffffff',
        align: 'center',
        stroke: '#272a31',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
  }

  update(_time: number, delta: number): void {
    // Физика строго fixed timestep, рендер — как успеет.
    const input = this.resolveInput();
    this.stepper.update(delta / 1000, () => {
      this.car.setInput(input);
      this.car.step();
      this.world.step(FIXED_DT);
      this.chunks.update(this.car.chassis.getPosition().x);
    });

    this.carView.update();
    this.debugView?.update(this.world);
    this.updateCamera();

    this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    const v = this.car.getForwardSpeed();
    this.speedText.setText(
      `${(v * 3.6).toFixed(0)} км/ч  x=${this.car.chassis.getPosition().x.toFixed(0)} м` +
        (this.car.isAirborne() ? '  ✈' : ''),
    );
  }

  private updateCamera(): void {
    const cam = this.cameras.main;
    const pos = this.car.chassis.getPosition();
    const vx = this.car.getForwardSpeed();

    const targetX = (pos.x + vx * CAMERA_LOOKAHEAD_S) * PX_PER_M;
    const targetY = pos.y * PX_PER_M - GAME_HEIGHT * 0.12;
    const cx = Phaser.Math.Linear(cam.midPoint.x, targetX, CAMERA_LERP);
    const cy = Phaser.Math.Linear(cam.midPoint.y, targetY, CAMERA_LERP);
    cam.centerOn(cx, cy);

    const zoomTarget = Phaser.Math.Clamp(ZOOM_BASE - Math.abs(vx) * ZOOM_PER_MS, ZOOM_MIN, ZOOM_BASE);
    this.camZoom = Phaser.Math.Linear(this.camZoom, zoomTarget, 0.04);
    cam.setZoom(this.camZoom);
  }
}
