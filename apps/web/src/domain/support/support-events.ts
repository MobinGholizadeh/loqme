import { EventEmitter } from 'events';
import type { SupportRealtimeEvent } from '@loqme/types';

/**
 * In-memory real-time event dispatcher for support chat.
 * Emits events per conversation and globally for admin listeners.
 */
class SupportEventHub {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Allow high number of concurrent listeners across multiple active chats
    this.emitter.setMaxListeners(500);
  }

  /**
   * Broadcast an event to conversation-specific listeners and admin channels
   */
  emit(event: SupportRealtimeEvent): void {
    // 1. Emit to specific conversation channel
    this.emitter.emit(`conversation:${event.conversationId}`, event);
    // 2. Emit to global admin support channel
    this.emitter.emit('admin:all', event);
  }

  /**
   * Subscribe to events for a specific conversation
   */
  subscribeConversation(
    conversationId: string,
    callback: (event: SupportRealtimeEvent) => void
  ): () => void {
    const channel = `conversation:${conversationId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  /**
   * Subscribe to all support events (for admin dashboard)
   */
  subscribeAdmin(callback: (event: SupportRealtimeEvent) => void): () => void {
    const channel = 'admin:all';
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }
}

// Global singleton instance
const globalSupportEventHub = globalThis as unknown as {
  __supportEventHub?: SupportEventHub;
};

export const supportEvents =
  globalSupportEventHub.__supportEventHub ??
  (globalSupportEventHub.__supportEventHub = new SupportEventHub());
