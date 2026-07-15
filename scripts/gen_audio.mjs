/**
 * Процедурная генерация звуков в public/assets/audio/*.wav (16-bit PCM mono).
 * Запуск: node scripts/gen_audio.mjs. Без зависимостей.
 * Луп двигателя — целое число циклов всех гармоник ⇒ бесшовный.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SR = 22050;
const OUT = 'public/assets/audio';

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(path.join(OUT, name), buf);
  console.log(`${name}: ${(buf.length / 1024).toFixed(0)} KiB`);
}

const TAU = Math.PI * 2;

/** Двигатель: гармоники 55 Гц + AM-«рокот», ровно 1 с ⇒ целые циклы, шва нет. */
function engine() {
  const dur = 1.0;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const f0 = 55;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const am = 0.75 + 0.25 * Math.sin(TAU * 11 * t); // 11 циклов за 1 с
    let s =
      Math.tanh(1.6 * Math.sin(TAU * f0 * t)) * 1.0 +
      Math.sin(TAU * f0 * 2 * t) * 0.45 +
      Math.sin(TAU * f0 * 3 * t) * 0.22 +
      Math.sin(TAU * f0 * 4.0 * t) * 0.1;
    out[i] = s * am * 0.28;
  }
  writeWav('engine_loop.wav', out);
}

function env(t, attack, release, dur) {
  if (t < attack) return t / attack;
  if (t > dur - release) return Math.max(0, (dur - t) / release);
  return 1;
}

/** Монета: два быстрых колокольчика. */
function coin() {
  const dur = 0.18;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const decay = Math.exp(-t * 22);
    const f = t < 0.07 ? 1318.5 : 1760; // E6 → A6
    out[i] = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t)) * decay * 0.5;
  }
  writeWav('coin.wav', out);
}

/** Флип: восходящий свип. */
function flip() {
  const dur = 0.3;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 420 + 620 * (t / dur);
    out[i] = Math.sin(TAU * f * t) * env(t, 0.01, 0.12, dur) * 0.45;
  }
  writeWav('flip.wav', out);
}

/** Смерть: нисходящий тон + шумовой удар. */
function death() {
  const dur = 0.55;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  let noiseLp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 260 - 190 * (t / dur);
    const tone = Math.sin(TAU * f * t) * 0.5;
    noiseLp += 0.25 * (Math.random() * 2 - 1 - noiseLp); // грубый LPF
    const thud = noiseLp * Math.exp(-t * 14) * 1.2;
    out[i] = (tone + thud) * env(t, 0.005, 0.2, dur) * 0.8;
  }
  writeWav('death.wav', out);
}

/** Канистра: два «бульковых» тона. */
function fuel() {
  const dur = 0.28;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = t < 0.13 ? 520 : 780;
    const sq = Math.tanh(3 * Math.sin(TAU * f * t)); // мягкий «квадрат»
    out[i] = sq * env(t, 0.01, 0.08, dur) * 0.35;
  }
  writeWav('fuel.wav', out);
}

/** Музыка: 8 с луп — пэды Am → F → C → G + лёгкое арпеджио. */
function music() {
  const dur = 8.0;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const chords = [
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [196.0, 261.63, 329.63], // C (2-я инверсия)
    [196.0, 246.94, 293.66], // G
  ];
  const seg = 2.0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ci = Math.floor(t / seg) % 4;
    const tc = t - Math.floor(t / seg) * seg;
    const shape = Math.sin((Math.PI * tc) / seg) ** 2; // мягкий вход/выход
    let pad = 0;
    for (const f of chords[ci]) {
      pad += Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 0.5 * t);
    }
    // арпеджио восьмыми
    const stepLen = seg / 8;
    const stepIdx = Math.floor(tc / stepLen);
    const ts = tc - stepIdx * stepLen;
    const af = chords[ci][stepIdx % 3] * 2;
    const arp = Math.sin(TAU * af * ts) * Math.exp(-ts * 9) * 0.3;
    out[i] = (pad * 0.11 * shape + arp) * 0.5;
  }
  writeWav('music_loop.wav', out);
}

mkdirSync(OUT, { recursive: true });
engine();
coin();
flip();
death();
fuel();
music();
