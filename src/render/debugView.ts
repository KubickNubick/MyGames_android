/**
 * Physics debug draw (?debug=1): контуры всех фикстур мира поверх сцены.
 */
import Phaser from 'phaser';
import { type World, type Vec2, Circle, Polygon, Chain, Edge } from 'planck';
import { PX_PER_M } from '../config';

export class DebugView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(1000);
  }

  update(world: World): void {
    const g = this.g;
    g.clear();
    for (let body = world.getBodyList(); body; body = body.getNext()) {
      for (let f = body.getFixtureList(); f; f = f.getNext()) {
        g.lineStyle(1.5, f.isSensor() ? 0xff00ff : body.isDynamic() ? 0x00ff88 : 0xffcd44, 0.9);
        const shape = f.getShape();
        if (shape instanceof Circle) {
          const c = body.getWorldPoint(shape.getCenter());
          g.strokeCircle(c.x * PX_PER_M, c.y * PX_PER_M, shape.getRadius() * PX_PER_M);
          const edge = body.getWorldPoint(
            shape
              .getCenter()
              .clone()
              .add({ x: shape.getRadius(), y: 0 } as Vec2),
          );
          g.lineBetween(c.x * PX_PER_M, c.y * PX_PER_M, edge.x * PX_PER_M, edge.y * PX_PER_M);
        } else if (shape instanceof Polygon || shape instanceof Chain || shape instanceof Edge) {
          const verts: Vec2[] = shape instanceof Edge ? [shape.m_vertex1, shape.m_vertex2] : shape.m_vertices;
          const pts = verts.map((v) => body.getWorldPoint(v));
          g.beginPath();
          g.moveTo(pts[0].x * PX_PER_M, pts[0].y * PX_PER_M);
          for (const p of pts.slice(1)) g.lineTo(p.x * PX_PER_M, p.y * PX_PER_M);
          if (shape instanceof Polygon) g.closePath();
          g.strokePath();
        }
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
