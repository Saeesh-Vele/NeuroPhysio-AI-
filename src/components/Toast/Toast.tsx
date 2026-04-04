import React, { type FC } from "react";
import type { Toast } from "../../types";
import "./Toast.css";

export const ToastContainer: FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`toast-item fade-up ${t.type === "error" ? "toast-error" : ""}`}
      >
        {t.message}
      </div>
    ))}
  </div>
);
