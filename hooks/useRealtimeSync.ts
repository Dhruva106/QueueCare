"use client";

import { useEffect, useRef, useState } from "react";
import { RealtimeEvent } from "@/lib/realtime";

interface UseRealtimeSyncOptions {
  onEvent?: (event: RealtimeEvent) => void;
  onRefreshNeeded?: () => void;
  pollingFallbackMs?: number;
}

export function useRealtimeSync({
  onEvent,
  onRefreshNeeded,
  pollingFallbackMs = 12000,
}: UseRealtimeSyncOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [clientCount, setClientCount] = useState(1);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const connect = () => {
      if (typeof window === "undefined") return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = lastEventIdRef.current
        ? `/api/realtime?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`
        : "/api/realtime";

      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.addEventListener("handshake", (e) => {
          try {
            const data = JSON.parse(e.data);
            setIsConnected(true);
            if (data.connectedClients) {
              setClientCount(data.connectedClients);
            }
          } catch (err) {
            console.error("Handshake parse error:", err);
          }
        });

        es.addEventListener("message", (e) => {
          try {
            const evt: RealtimeEvent = JSON.parse(e.data);
            lastEventIdRef.current = evt.id;
            setLastEvent(evt);
            setIsConnected(true);

            if (onEvent) {
              onEvent(evt);
            }
            if (onRefreshNeeded) {
              onRefreshNeeded();
            }
          } catch (err) {
            console.error("Realtime event parse error:", err);
          }
        });

        es.onerror = () => {
          setIsConnected(false);
          es.close();
          eventSourceRef.current = null;

          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            connectFnRef.current();
            if (onRefreshNeeded) onRefreshNeeded();
          }, 3000);
        };
      } catch (err) {
        console.error("Failed to initialize EventSource:", err);
        setIsConnected(false);
      }
    };

    connectFnRef.current = connect;
    connect();

    const pollInterval = setInterval(() => {
      if (!isConnected && onRefreshNeeded) {
        onRefreshNeeded();
      }
    }, pollingFallbackMs);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      clearInterval(pollInterval);
    };
  }, [isConnected, onEvent, onRefreshNeeded, pollingFallbackMs]);

  return {
    isConnected,
    clientCount,
    lastEvent,
    reconnect: () => connectFnRef.current(),
  };
}
