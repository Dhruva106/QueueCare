// =============================================================================
// QueueCare: Real-Time Event Broadcasting & SSE Hub
// Centralized, typed event pub/sub system for low-latency live operations
// =============================================================================

export type RealtimeEventType =
  | "PatientCreated"
  | "PatientUpdated"
  | "DoctorCreated"
  | "DoctorUpdated"
  | "AppointmentBooked"
  | "AppointmentCancelled"
  | "AppointmentRescheduled"
  | "PatientCheckedIn"
  | "QueueEntryUpdated"
  | "QueueStatusChanged"
  | "PriorityOverridden"
  | "StatsUpdated";

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  timestamp: string;
  payload: Record<string, unknown>;
  scope?: {
    role?: string;
    patientId?: number;
    doctorId?: number;
  };
}

type ClientCallback = (event: RealtimeEvent) => void;

class RealtimeHub {
  private subscribers: Set<ClientCallback> = new Set();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize = 50;

  /**
   * Subscribe a new client connection (e.g. SSE stream controller)
   */
  public subscribe(callback: ClientCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Publish an event to all active subscribers
   */
  public publish(type: RealtimeEventType, payload: Record<string, unknown> = {}, scope?: RealtimeEvent["scope"]): RealtimeEvent {
    const event: RealtimeEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
      scope,
    };

    // Buffer in recent history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Broadcast to active clients
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error("Error dispatching event to subscriber:", err);
      }
    });

    return event;
  }

  /**
   * Returns recent event history for client reconnection synchronization
   */
  public getHistory(sinceId?: string): RealtimeEvent[] {
    if (!sinceId) {
      return this.eventHistory.slice(-15);
    }
    const idx = this.eventHistory.findIndex((e) => e.id === sinceId);
    if (idx === -1) {
      return this.eventHistory.slice(-15);
    }
    return this.eventHistory.slice(idx + 1);
  }

  /**
   * Current number of connected real-time subscribers
   */
  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global singleton to persist across Next.js hot reloads in development
declare global {
  var __queuecare_realtime_hub__: RealtimeHub | undefined;
}

export const realtimeHub: RealtimeHub =
  global.__queuecare_realtime_hub__ || (global.__queuecare_realtime_hub__ = new RealtimeHub());

export function publishRealtimeEvent(
  type: RealtimeEventType,
  payload: Record<string, unknown> = {},
  scope?: RealtimeEvent["scope"]
): RealtimeEvent {
  return realtimeHub.publish(type, payload, scope);
}
