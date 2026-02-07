export class EventEmitter<Events extends Record<string, any[]>> {
  private callbacks: Partial<
    Record<keyof Events, Array<(...args: any[]) => void>>
  > = {};

  /**
   * Register a listener for an event
   * @returns this (for chaining)
   */
  on<K extends keyof Events>(event: K, fn: (...args: Events[K]) => void): this {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }

    this.callbacks[event]!.push(fn);
    return this;
  }

  /**
   * Register a listener that will be called only once
   */
  once<K extends keyof Events>(
    event: K,
    fn: (...args: Events[K]) => void,
  ): this {
    const wrapper = (...args: Events[K]) => {
      fn(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * Emit an event with arguments
   * @returns this (for chaining)
   */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): this {
    const listeners = this.callbacks[event];
    if (listeners) {
      // Copy array to prevent issues if a listener removes itself
      [...listeners].forEach((callback) => callback(...args));
    }
    return this;
  }

  /**
   * Remove a specific listener or all listeners for an event
   * @returns this (for chaining)
   */
  off<K extends keyof Events>(
    event: K,
    fn?: (...args: Events[K]) => void,
  ): this {
    const listeners = this.callbacks[event];
    if (!listeners) return this;

    if (fn) {
      this.callbacks[event] = listeners.filter((cb) => cb !== fn);
      if (this.callbacks[event]!.length === 0) {
        delete this.callbacks[event];
      }
    } else {
      delete this.callbacks[event];
    }

    return this;
  }

  /**
   * Remove all listeners (cleanup)
   */
  destroy(): void {
    this.callbacks = {};
  }
}


export type AppEvents = {
  "chat:created": [];
};

export const emitter = new EventEmitter<AppEvents>();