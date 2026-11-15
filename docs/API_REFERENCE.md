# EyeHand (cc68) — API Reference

## `@cc68/core`

### Vector Math
- `Vector2(x: number, y: number)`
  - `.add(v: Vector2): Vector2`
  - `.sub(v: Vector2): Vector2`
  - `.scale(s: number): Vector2`
  - `.dot(v: Vector2): number`
  - `.length(): number`
  - `.normalize(): Vector2`
  - `.lerp(target: Vector2, alpha: number): Vector2`
  - `.distanceTo(v: Vector2): number`
- `Vector3(x: number, y: number, z: number)`
  - `.cross(v: Vector3): Vector3`
  - `.dot(v: Vector3): number`
  - `.length(): number`
  - `.normalize(): Vector3`
- `Transform2D`
  - `ndcToScreen(ndc: Vector2, viewport: ViewportDimensions): Vector2`
  - `screenToNdc(screen: Vector2, viewport: ViewportDimensions): Vector2`
  - `containsPoint(box: BoundingBox2D, point: Vector2): boolean`
  - `distanceToBoxCenter(box: BoundingBox2D, point: Vector2): number`

### Signal Smoothing Filters
- `OneEuroFilter1D(config?: Partial<OneEuroConfig>)`
  - `.filter(value: number, timestampMs: number): number`
  - `.reset(): void`
- `OneEuroFilter2D(config?: Partial<OneEuroConfig>)`
  - `.filter(point: Vector2, timestampMs: number): Vector2`
  - `.reset(): void`
- `OneEuroFilter3D(config?: Partial<OneEuroConfig>)`
  - `.filter(point: Vector3, timestampMs: number): Vector3`
  - `.reset(): void`

### Event Bus
- `EyeHandEventBus`
  - `.on<K>(event: K, handler: (data: EventMap[K]) => void): () => void`
  - `.once<K>(event: K, handler: (data: EventMap[K]) => void): () => void`
  - `.emit<K>(event: K, data: EventMap[K]): void`
  - `.clear(): void`
  - `.listenerCount(event: K): number`
