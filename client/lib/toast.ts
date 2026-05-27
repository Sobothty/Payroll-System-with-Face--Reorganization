"use client";

export type ToastTone = "error" | "success" | "info";

export type ToastPayload = {
  id?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

export const TOAST_EVENT = "pulseledger:toast";

function buildToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: {
        durationMs: 4200,
        tone: "info",
        ...payload,
        id: payload.id ?? buildToastId(),
      },
    }),
  );
}

export function showErrorToast(message: string, durationMs?: number) {
  showToast({ message, tone: "error", durationMs });
}

export function showSuccessToast(message: string, durationMs?: number) {
  showToast({ message, tone: "success", durationMs });
}
