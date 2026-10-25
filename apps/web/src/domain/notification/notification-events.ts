import { EventEmitter } from 'events';
import type { NotificationRealtimeEvent } from '@loqme/types';

class NotificationEventHub {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(1000);
  }

  emit(event: NotificationRealtimeEvent): void {
    // 1. Emit to specific user channel
    this.emitter.emit(`user:${event.userId}`, event);
    // 2. Emit to global admin channel
    this.emitter.emit('admin:notifications', event);
  }

  subscribeUser(userId: string, callback: (event: NotificationRealtimeEvent) => void): () => void {
    const channel = `user:${userId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  subscribeAdmin(callback: (event: NotificationRealtimeEvent) => void): () => void {
    const channel = 'admin:notifications';
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }
}

const globalNotificationEventHub = globalThis as unknown as {
  __notificationEventHub?: NotificationEventHub;
};

export const notificationEvents =
  globalNotificationEventHub.__notificationEventHub ??
  (globalNotificationEventHub.__notificationEventHub = new NotificationEventHub());
