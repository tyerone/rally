import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastContextValue {
  ping: (msg: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const ping = useCallback((msg: string, duration = 1600) => {
    clearTimeout(timer.current);
    setMessage(msg);
    timer.current = setTimeout(() => setMessage(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ ping }}>
      {children}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 104,
          transform: `translateX(-50%) translateY(${message ? "0" : "8px"})`,
          background: "#23273B",
          border: "1px solid #343A56",
          color: "#fff",
          fontWeight: 800,
          fontSize: 13,
          padding: "10px 18px",
          borderRadius: 22,
          opacity: message ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity .25s, transform .25s",
          zIndex: 40,
          whiteSpace: "nowrap",
          maxWidth: 380,
          overflow: "hidden",
          textOverflow: "ellipsis",
          boxShadow: "0 8px 24px rgba(0,0,0,.4)",
        }}
      >
        {message ?? ""}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
