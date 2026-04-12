import { useCallback, useEffect, useRef } from "react";

export function useWebSocket(
  url: string | null,
  onMessage: (data: unknown) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
    };

    ws.onmessage = event => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        // Ignore malformed websocket payloads.
      }
    };

    ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** attemptRef.current, 30_000);
      attemptRef.current += 1;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onMessage, url]);

  useEffect(() => {
    if (!url) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    connect();

    return () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, url]);

  return wsRef;
}
