import { EyeHandEventMap, EyeHandEventType } from '../types/events';

export type EventHandler<T> = (data: T) => void;

/**
 * Type-safe, high-performance event bus for EyeHand system events.
 */
export class EyeHandEventBus {
  private listeners: Map<EyeHandEventType, Set<EventHandler<any>>> = new Map();

  /**
   * Subscribe to an EyeHand event. Returns an unsubscribe function.
   */
  on<K extends EyeHandEventType>(
    event: K,
    handler: EventHandler<EyeHandEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to an EyeHand event for a single invocation.
   */
  once<K extends EyeHandEventType>(
    event: K,
    handler: EventHandler<EyeHandEventMap[K]>
  ): () => void {
    const unsub = this.on(event, (data) => {
      unsub();
      handler(data);
    });
    return unsub;
  }

  /**
   * Dispatch an EyeHand event to all registered listeners.
   */
  emit<K extends EyeHandEventType>(event: K, data: EyeHandEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    for (const handler of Array.from(handlers)) {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in EyeHand event handler for ${event}:`, err);
      }
    }
  }

  /**
   * Clear all registered listeners.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Count active listeners for a specific event type.
   */
  listenerCount(event: EyeHandEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
