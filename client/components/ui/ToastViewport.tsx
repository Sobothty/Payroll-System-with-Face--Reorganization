"use client";

import { useEffect, useRef, useState } from "react";

import { TOAST_EVENT, type ToastPayload } from "@/lib/toast";

type VisibleToast = Required<Pick<ToastPayload, "id" | "message" | "tone" | "durationMs">>;

export default function ToastViewport() {
  const [toasts, setToasts] = useState<VisibleToast[]>([]);
  const timeoutRefs = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timeoutMap = timeoutRefs.current;

    function dismissToast(id: string) {
      const timer = timeoutMap.get(id);
      if (timer) {
        window.clearTimeout(timer);
        timeoutMap.delete(id);
      }
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }

    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;
      const payload = customEvent.detail;
      if (!payload?.id || !payload.message) {
        return;
      }

      const nextToast: VisibleToast = {
        id: payload.id,
        message: payload.message,
        tone: payload.tone ?? "info",
        durationMs: payload.durationMs ?? 4200,
      };

      setToasts((current) => [...current.filter((toast) => toast.id !== nextToast.id), nextToast].slice(-4));

      const existingTimer = timeoutMap.get(nextToast.id);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const timer = window.setTimeout(() => dismissToast(nextToast.id), nextToast.durationMs);
      timeoutMap.set(nextToast.id, timer);
    }

    window.addEventListener(TOAST_EVENT, handleToast as EventListener);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast as EventListener);
      timeoutMap.forEach((timer) => window.clearTimeout(timer));
      timeoutMap.clear();
    };
  }, []);

  return (
    <div
      className="toast-viewport fixed right-6 top-6 z-[70] grid w-[min(360px,calc(100vw-32px))] gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-card rounded-2xl border bg-[var(--bg-surface)] p-4 shadow-[0_18px_40px_rgba(7,9,14,0.22)] backdrop-blur toast-${toast.tone}`}
        >
          <div className="toast-header mb-1.5">
            <strong>{toast.tone === "error" ? "Error" : toast.tone === "success" ? "Success" : "Notice"}</strong>
          </div>
          <div className="toast-message text-sm leading-6 text-[var(--text-soft-strong)]">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
