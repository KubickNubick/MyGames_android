/**
 * Частицы машины: пыль из-под колёс при пробуксовке/приземлении, выхлоп.
 * Нет текстур fx — частицы просто не создаются (не ошибка).
 */
import Phaser from 'phaser';
import { Vec2 } from 'planck';
import { PX_PER_M } from '../config';
import type { Car } from '../core/physics/car';
import { hasTexture } from './textures';

const TEX_DUST = 'fx_dust';
const TEX_SMOKE = 'fx_smoke';
const DEPTH_FX = 3;

/** Пробуксовка: |скорость обода − скорость машины| выше порога, м/с. */
const SLIP_THRESHOLD = 2.0;
const EXHAUST_PERIOD_MS = 90;

export class CarFx {
  private dust: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private lastExhaustAt = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly car: Car,
  ) {
    if (hasTexture(scene, TEX_DUST)) {
      this.dust = scene.add.particles(0, 0, TEX_DUST, {
        emitting: false,
        lifespan: { min: 350, max: 700 },
        speed: { min: 25, max: 95 },
        angle: { min: 200, max: 340 },
        alpha: { start: 0.85, end: 0 },
        scale: { start: 0.45, end: 1.1 },
        gravityY: 60,
      });
      this.dust.setDepth(DEPTH_FX);
    }
    if (hasTexture(scene, TEX_SMOKE)) {
      this.smoke = scene.add.particles(0, 0, TEX_SMOKE, {
        emitting: false,
        lifespan: { min: 450, max: 800 },
        speed: { min: 10, max: 30 },
        angle: { min: 250, max: 290 },
        alpha: { start: 0.5, end: 0 },
        scale: { start: 0.3, end: 0.9 },
      });
      this.smoke.setDepth(DEPTH_FX);
    }
  }

  /** Звать каждый кадр. throttling — газ/реверс активен. */
  update(timeMs: number, throttling: boolean): void {
    // Пыль при пробуксовке ведущего (заднего) колеса.
    if (this.dust && this.car.isWheelOnGround('rear')) {
      const wheel = this.car.wheels.rear;
      const rimSpeed = wheel.getAngularVelocity() * this.car.params.wheel.radius;
      const slip = Math.abs(rimSpeed - this.car.getForwardSpeed());
      if (slip > SLIP_THRESHOLD) {
        const pos = wheel.getPosition();
        const r = this.car.params.wheel.radius;
        this.dust.emitParticleAt(
          pos.x * PX_PER_M,
          (pos.y + r * 0.8) * PX_PER_M,
          Math.min(3, Math.ceil(slip / 3)),
        );
      }
    }

    // Выхлоп при работе мотора: из задней части кузова.
    if (this.smoke && throttling && timeMs - this.lastExhaustAt > EXHAUST_PERIOD_MS) {
      this.lastExhaustAt = timeMs;
      const p = this.car.chassis.getWorldPoint(new Vec2(-this.car.params.chassis.halfWidth, 0.1));
      this.smoke.emitParticleAt(p.x * PX_PER_M, p.y * PX_PER_M, 1);
    }
  }

  /** Всплеск пыли под обоими колёсами при жёстком приземлении. */
  landingBurst(intensity01: number): void {
    if (!this.dust) return;
    const count = Math.round(4 + 10 * intensity01);
    for (const key of ['rear', 'front'] as const) {
      const pos = this.car.wheels[key].getPosition();
      const r = this.car.params.wheel.radius;
      this.dust.emitParticleAt(pos.x * PX_PER_M, (pos.y + r * 0.8) * PX_PER_M, count);
    }
  }

  destroy(): void {
    this.dust?.destroy();
    this.smoke?.destroy();
  }
}
