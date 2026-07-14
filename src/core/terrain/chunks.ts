/**
 * Менеджер чанков рельефа: чистый модуль без Phaser и без planck —
 * физтело и графику создают/удаляют колбэки владельца.
 *
 * Чанк i покрывает [i*length, (i+1)*length]; соседние чанки включают общую
 * граничную точку из одного heightFn ⇒ стыки без щелей.
 */
import type { Point2 } from '../../data/vehicles';
import type { HeightFn } from './generator';

export const CHUNK_LENGTH_M = 48;
export const CHUNK_POINT_STEP_M = 0.75;
export const CHUNKS_AHEAD = 2;
export const CHUNKS_BEHIND = 1;

export interface Chunk {
  index: number;
  startX: number;
  endX: number;
  /** Точки поверхности с шагом pointStep, включая обе границы. */
  points: Point2[];
}

export interface ChunkCallbacks {
  onCreate(chunk: Chunk): void;
  onDestroy(chunk: Chunk): void;
}

export interface ChunkManagerOptions {
  chunkLength?: number;
  pointStep?: number;
  ahead?: number;
  behind?: number;
}

export class ChunkManager {
  private readonly active = new Map<number, Chunk>();
  private readonly chunkLength: number;
  private readonly pointStep: number;
  private readonly ahead: number;
  private readonly behind: number;

  constructor(
    private readonly heightFn: HeightFn,
    private readonly callbacks: ChunkCallbacks,
    options: ChunkManagerOptions = {},
  ) {
    this.chunkLength = options.chunkLength ?? CHUNK_LENGTH_M;
    this.pointStep = options.pointStep ?? CHUNK_POINT_STEP_M;
    this.ahead = options.ahead ?? CHUNKS_AHEAD;
    this.behind = options.behind ?? CHUNKS_BEHIND;
  }

  /** Обеспечить чанки вокруг позиции камеры/машины; лишние — удалить. */
  update(centerX: number): void {
    const centerIndex = Math.floor(centerX / this.chunkLength);
    const from = centerIndex - this.behind;
    const to = centerIndex + this.ahead;

    for (const [index, chunk] of this.active) {
      if (index < from || index > to) {
        this.active.delete(index);
        this.callbacks.onDestroy(chunk);
      }
    }
    for (let index = from; index <= to; index++) {
      if (!this.active.has(index)) {
        const chunk = this.buildChunk(index);
        this.active.set(index, chunk);
        this.callbacks.onCreate(chunk);
      }
    }
  }

  getActiveIndices(): number[] {
    return [...this.active.keys()].sort((a, b) => a - b);
  }

  getActiveCount(): number {
    return this.active.size;
  }

  heightAt(x: number): number {
    return this.heightFn(x);
  }

  destroyAll(): void {
    for (const chunk of this.active.values()) this.callbacks.onDestroy(chunk);
    this.active.clear();
  }

  private buildChunk(index: number): Chunk {
    const startX = index * this.chunkLength;
    const endX = startX + this.chunkLength;
    const segments = Math.round(this.chunkLength / this.pointStep);
    const points: Point2[] = [];
    for (let s = 0; s <= segments; s++) {
      // x граничных точек считаем от индексов, а не накоплением — стыки бит-в-бит
      const x = startX + s * this.pointStep;
      points.push({ x, y: this.heightFn(x) });
    }
    return { index, startX, endX, points };
  }
}
