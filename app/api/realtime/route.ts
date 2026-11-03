// =============================================================================
// QueueCare: Real-Time Server-Sent Events (SSE) Route
// Streaming endpoint for push notifications to active hospital clients
// =============================================================================

import { NextRequest } from "next/server";
import { realtimeHub, RealtimeEvent } from "@/lib/realtime";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  const { searchParams } = new URL(request.url);
  const lastEventId = searchParams.get("lastEventId") || undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial Handshake Message
      const handshake = {
        type: "Connected",
        message: "QueueCare Real-Time Stream Established",
        userRole: user?.role || "Guest",
        connectedClients: realtimeHub.getSubscriberCount() + 1,
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(`event: handshake\ndata: ${JSON.stringify(handshake)}\n\n`));

      // 2. Replay recent missed events if client reconnected with lastEventId
      if (lastEventId) {
        const missedEvents = realtimeHub.getHistory(lastEventId);
        for (const evt of missedEvents) {
          controller.enqueue(encoder.encode(`id: ${evt.id}\nevent: message\ndata: ${JSON.stringify(evt)}\n\n`));
        }
      }

      // 3. Subscribe to Realtime Hub for live broadcast
      const unsubscribe = realtimeHub.subscribe((event: RealtimeEvent) => {
        // Scoped privacy check: Ensure patients do not receive another patient's private records
        if (event.scope?.patientId && user?.role === "Patient") {
          if (user.linkedPatientId && user.linkedPatientId !== event.scope.patientId) {
            return; // Ignore this private event for this patient
          }
        }

        try {
          const payload = `id: ${event.id}\nevent: message\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error("SSE enqueue failed, closing stream:", err);
          unsubscribe();
        }
      });

      // 4. Heartbeat to keep connection alive through proxies & Safari
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 20000);

      // 5. Cleanup on abort/disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

