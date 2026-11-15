import { Vector2 } from './vector2';

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

/**
 * Coordinate space transformations and collision helpers.
 */
export class Transform2D {
  /**
   * Convert normalized device coordinates (NDC [0, 1]) to screen pixel coordinates.
   */
  static ndcToScreen(ndc: Vector2, viewport: ViewportDimensions): Vector2 {
    return new Vector2(ndc.x * viewport.width, ndc.y * viewport.height);
  }

  /**
   * Convert screen pixel coordinates to normalized coordinates [0, 1].
   */
  static screenToNdc(screen: Vector2, viewport: ViewportDimensions): Vector2 {
    if (viewport.width === 0 || viewport.height === 0) return new Vector2(0, 0);
    return new Vector2(screen.x / viewport.width, screen.y / viewport.height);
  }

  /**
   * Check if a 2D point lies within a bounding box.
   */
  static containsPoint(box: BoundingBox2D, point: Vector2): boolean {
    return (
      point.x >= box.minX &&
      point.x <= box.maxX &&
      point.y >= box.minY &&
      point.y <= box.maxY
    );
  }

  /**
   * Calculate distance from point to the center of a bounding box.
   */
  static distanceToBoxCenter(box: BoundingBox2D, point: Vector2): number {
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Expand bounding box by a padding margin (useful for magnetic snapping).
   */
  static expandBox(box: BoundingBox2D, margin: number): BoundingBox2D {
    return {
      minX: box.minX - margin,
      minY: box.minY - margin,
      maxX: box.maxX + margin,
      maxY: box.maxY + margin,
    };
  }
}
