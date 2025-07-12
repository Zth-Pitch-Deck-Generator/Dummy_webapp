import { useEffect, useRef } from "react";

export function useEventSource(
  url: string,
  onMessage: (data: string) => void,
  onEnd?: () => void
) {
  const esRef = useRef<EventSource>();

  useEffect(() => {
    esRef.current = new EventSource(url);
    esRef.current.onmessage = (e) => onMessage(e.data);
    esRef.current.onerror  = () => esRef.current?.close();
    esRef.current.addEventListener("end", () => {
      esRef.current?.close();
      onEnd?.();
    });

    return () => esRef.current?.close();
  }, [url]);
}
