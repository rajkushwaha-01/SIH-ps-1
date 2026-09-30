import { useEffect } from "react";
import { api } from "../services/api";

interface LiveUpdatesOptions {
  onDetection?: (data: any) => void;
  onAlert?: (data: any) => void;
  onCameraStatus?: (data: any) => void;
  onAny?: () => void;
}

export function useLiveUpdates({ onDetection, onAlert, onCameraStatus, onAny }: LiveUpdatesOptions) {
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: any = null;

    function connect() {
      try {
        es = api.createEventSource();

        es.addEventListener("detection", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onDetection?.(data);
            onAny?.();
          } catch (err) {
            console.error("Error parsing SSE detection event", err);
          }
        });

        es.addEventListener("alert", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onAlert?.(data);
            onAny?.();
          } catch (err) {
            console.error("Error parsing SSE alert event", err);
          }
        });

        es.addEventListener("camera_status", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onCameraStatus?.(data);
            onAny?.();
          } catch (err) {
            console.error("Error parsing SSE camera_status event", err);
          }
        });

        es.onerror = () => {
          // Close and attempt retry after 5 seconds if disconnected
          es?.close();
          es = null;
          retryTimer = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.warn("SSE connection error, falling back to interval polling:", err);
      }
    }

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (es) es.close();
    };
  }, [onDetection, onAlert, onCameraStatus, onAny]);
}
