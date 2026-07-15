/**
 * Звук игры: луп двигателя с rate от оборотов колеса (главный звук!),
 * SFX событий, фоновая музыка. Отсутствующий файл — тишина, не ошибка.
 * Громкость/mute — из настроек профиля (сейв v2).
 */
import Phaser from 'phaser';
import type { PlayerProfile } from '../core/save/profile';

export const AUDIO_KEYS = {
  engine: 'sfx_engine_loop',
  coin: 'sfx_coin',
  flip: 'sfx_flip',
  death: 'sfx_death',
  fuel: 'sfx_fuel',
  music: 'music_loop',
} as const;

const ENGINE_RATE_MIN = 0.55;
const ENGINE_RATE_MAX = 1.9;
const ENGINE_VOL_IDLE = 0.22;
const ENGINE_VOL_THROTTLE = 0.4;
const MUSIC_VOLUME = 0.35;
/** Минимальный интервал между звуками монет, мс (группа из 12 — не пулемёт). */
const COIN_THROTTLE_MS = 70;

export class GameAudio {
  private engine: Phaser.Sound.BaseSound | null = null;
  private engineRate = ENGINE_RATE_MIN;
  private lastCoinAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly profile: PlayerProfile,
  ) {
    this.applySettings();

    if (scene.cache.audio.exists(AUDIO_KEYS.engine)) {
      this.engine = scene.sound.add(AUDIO_KEYS.engine, {
        loop: true,
        volume: ENGINE_VOL_IDLE,
        rate: ENGINE_RATE_MIN,
      });
      this.engine.play();
    }

    // Музыка живёт на глобальном SoundManager — не перезапускаем на рестартах.
    if (scene.cache.audio.exists(AUDIO_KEYS.music) && !scene.sound.get(AUDIO_KEYS.music)) {
      scene.sound.add(AUDIO_KEYS.music, { loop: true, volume: MUSIC_VOLUME }).play();
    }
  }

  /** Применить громкость/mute из профиля к глобальному звуку. */
  applySettings(): void {
    const s = this.profile.settings;
    this.scene.sound.volume = s.volume;
    this.scene.sound.mute = s.muted;
  }

  /** Каждый кадр: обороты заднего колеса 0..1 и есть ли газ. */
  updateEngine(wheelSpeed01: number, throttling: boolean, deltaMs: number): void {
    if (!this.engine) return;
    const target =
      ENGINE_RATE_MIN + (ENGINE_RATE_MAX - ENGINE_RATE_MIN) * Phaser.Math.Clamp(wheelSpeed01, 0, 1);
    const k = Math.min(1, (deltaMs / 1000) * 6);
    this.engineRate += (target - this.engineRate) * k;
    const sound = this.engine as Phaser.Sound.WebAudioSound;
    sound.setRate(this.engineRate);
    sound.setVolume(throttling ? ENGINE_VOL_THROTTLE : ENGINE_VOL_IDLE);
  }

  setEnginePaused(paused: boolean): void {
    if (!this.engine) return;
    if (paused && this.engine.isPlaying) this.engine.pause();
    else if (!paused && this.engine.isPaused) this.engine.resume();
  }

  playCoin(): void {
    const now = this.scene.time.now;
    if (now - this.lastCoinAt < COIN_THROTTLE_MS) return;
    this.lastCoinAt = now;
    this.playOnce(AUDIO_KEYS.coin, { detune: Phaser.Math.Between(-60, 120) });
  }

  playFlip(): void {
    this.playOnce(AUDIO_KEYS.flip);
  }

  playDeath(): void {
    this.engine?.stop();
    this.playOnce(AUDIO_KEYS.death);
  }

  playFuel(): void {
    this.playOnce(AUDIO_KEYS.fuel);
  }

  destroy(): void {
    this.engine?.destroy();
    this.engine = null;
    // музыку не трогаем — играет между заездами
  }

  private playOnce(key: string, extra?: Phaser.Types.Sound.SoundConfig): void {
    if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, extra);
  }
}
