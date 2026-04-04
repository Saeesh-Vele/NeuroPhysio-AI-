import { useState, useCallback } from "react";
import type { Toast, ToastType } from "../types";
import { uid } from "../utils";

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => {
        const idx = t.findIndex((x) => x.id === id);
        if (idx === -1) return t;
        const next = [...t];
        next.splice(idx, 1);
        return next;
      });
    }, 3000);
  }, []);

  return { toasts, showToast };
};
